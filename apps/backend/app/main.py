from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

from app.db import get_conn, init_db
from app.ingest.loaders import load_text_from_bytes
from app.ingest.vector_store import store_document
from app.seed import seed_demo
from app.tools import rag_tools, router, sql_tools

app = FastAPI(title="Maintenance RAG Backend", version="0.1.0")


class DateRange(BaseModel):
    start: str
    end: str


class ChatRequest(BaseModel):
    message: str
    site_id: Optional[str] = None
    equipment_uid: Optional[str] = None
    date_range: Optional[DateRange] = None


class SuggestedWorkOrder(BaseModel):
    site_id: str
    equipment_uid: str
    job_type: str
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    required_certs: Optional[list[str]] = None
    employee_id: Optional[str] = None


class DraftWorkOrderRequest(SuggestedWorkOrder):
    created_by: str


class ApproveRequest(BaseModel):
    admin_id: str


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/seed")
def seed() -> dict:
    with get_conn() as conn:
        return seed_demo(conn)


@app.post("/chat")
def chat(request: ChatRequest) -> dict:
    intents = router.route_message(request.message)
    evidence: list[dict] = []
    checks: dict[str, Any] = {}
    answer_parts: list[str] = []
    suggested_work_order: Optional[dict] = None

    with get_conn() as conn:
        if intents["rag_manual"]:
            manual_evidence = rag_tools.retrieve_chunks(
                conn, request.message, "manual", request.site_id, request.equipment_uid
            )
            evidence.extend(manual_evidence)
            answer_parts.append(rag_tools.generate_answer(request.message, manual_evidence))

        if intents["rag_preventive"]:
            preventive_evidence = rag_tools.retrieve_chunks(
                conn, request.message, "preventive", request.site_id, request.equipment_uid
            )
            evidence.extend(preventive_evidence)
            answer_parts.append(rag_tools.generate_answer(request.message, preventive_evidence))

        schedule = None
        if intents["schedule"] and request.equipment_uid:
            schedule = sql_tools.get_next_maintenance(conn, request.equipment_uid)
            if schedule:
                checks["schedule"] = schedule
                answer_parts.append(
                    f"Next maintenance for {schedule['equipment_uid']} is {schedule['next_date']}"
                )
            else:
                answer_parts.append("No scheduled maintenance found for that equipment.")

        if intents["due"] and request.site_id:
            start = request.date_range.start if request.date_range else datetime.utcnow().date().isoformat()
            end = request.date_range.end if request.date_range else (datetime.utcnow().date() + timedelta(days=7)).isoformat()
            due_list = sql_tools.list_due_maintenance(conn, request.site_id, start, end)
            if due_list:
                summary = ", ".join([f"{row['equipment_uid']} on {row['next_date']}" for row in due_list])
                answer_parts.append(f"Maintenance due between {start} and {end}: {summary}")
            else:
                answer_parts.append("No maintenance due in that window.")

        if intents["employee"] and request.site_id:
            required_certs = schedule["required_certs"] if schedule else []
            employees = sql_tools.find_qualified_employees(conn, request.site_id, required_certs)
            start_ts = None
            end_ts = None
            if request.date_range:
                start_ts = datetime.fromisoformat(request.date_range.start)
                end_ts = datetime.fromisoformat(request.date_range.end)
            elif schedule:
                start_ts = datetime.fromisoformat(f"{schedule['next_date']}T08:00:00")
                duration = schedule.get("est_duration_min") or 60
                end_ts = start_ts + timedelta(minutes=duration)

            employee_payload = []
            for emp in employees:
                conflicts = []
                if start_ts and end_ts:
                    conflicts = sql_tools.check_employee_conflicts(conn, emp["employee_id"], start_ts, end_ts)
                employee_payload.append(
                    {
                        "employee_id": emp["employee_id"],
                        "name": emp["name"],
                        "conflicts": conflicts,
                    }
                )
            checks["employees"] = employee_payload
            if employee_payload:
                answer_parts.append("Found qualified employees for the requested criteria.")
            else:
                answer_parts.append("No qualified employees found for that criteria.")

        if intents["inventory"] and request.site_id:
            part_query = router.extract_part_query(request.message) or request.equipment_uid or ""
            if part_query:
                inventory = sql_tools.check_inventory(conn, request.site_id, part_query)
                checks["inventory"] = inventory
                if inventory:
                    answer_parts.append("Inventory results are available for the requested part.")
                else:
                    answer_parts.append("No inventory matches found.")

        if intents["suggest_work_order"] and request.site_id and request.equipment_uid:
            job_type = router.guess_job_type(request.message)
            planned_start = request.date_range.start if request.date_range else None
            planned_end = request.date_range.end if request.date_range else None
            required_certs = schedule["required_certs"] if schedule else []
            employee_id = None
            for emp in checks.get("employees", []):
                if not emp.get("conflicts"):
                    employee_id = emp["employee_id"]
                    break
            suggested_work_order = {
                "site_id": request.site_id,
                "equipment_uid": request.equipment_uid,
                "job_type": job_type,
                "planned_start": planned_start,
                "planned_end": planned_end,
                "required_certs": required_certs,
                "employee_id": employee_id,
            }
            answer_parts.append("Suggested a draft work order based on the request.")

    answer = " ".join([part for part in answer_parts if part])
    if not answer:
        answer = "I can help with manuals, schedules, employees, inventory, and work orders."

    response: dict[str, Any] = {"answer": answer}
    if evidence:
        response["evidence"] = evidence
    if checks:
        response["checks"] = checks
    if suggested_work_order:
        response["suggested_work_order"] = suggested_work_order
    return response


@app.get("/workorders")
def list_work_orders(site_id: Optional[str] = None, status: Optional[str] = None) -> list[dict]:
    with get_conn() as conn:
        return sql_tools.get_work_orders(conn, site_id, status)


@app.get("/workorders/{work_order_id}")
def get_work_order(work_order_id: int) -> dict:
    with get_conn() as conn:
        row = sql_tools.get_work_order(conn, work_order_id)
        if not row:
            raise HTTPException(status_code=404, detail="Work order not found")
        return row


@app.post("/workorders/draft")
def create_work_order(
    request: DraftWorkOrderRequest,
    x_user_role: str = Header(default="user"),
    x_user_id: str = Header(default="unknown"),
) -> dict:
    with get_conn() as conn:
        result = sql_tools.create_work_order(
            conn,
            request.model_dump(),
            require_approval=False,
            actor_role=x_user_role,
            actor_id=x_user_id or request.created_by,
        )
        return result


@app.post("/workorders/{work_order_id}/approve")
def approve_work_order(
    work_order_id: int,
    request: ApproveRequest,
    x_user_role: str = Header(default="user"),
) -> dict:
    if x_user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    with get_conn() as conn:
        return sql_tools.approve_work_order(conn, work_order_id, request.admin_id)


@app.post("/ingest/csv/{kind}")
def ingest_csv(kind: str, file: UploadFile = File(...)) -> dict:
    import csv

    if kind not in {"employees", "schedules", "inventory"}:
        raise HTTPException(status_code=400, detail="Invalid ingest kind")

    content = file.file.read().decode(errors="ignore").splitlines()
    reader = csv.DictReader(content)
    inserted = 0

    with get_conn() as conn:
        cursor = conn.cursor()
        for row in reader:
            if kind == "employees":
                cursor.execute(
                    """
                    INSERT INTO employees (employee_id, site_id, name)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (employee_id) DO UPDATE SET
                        site_id = EXCLUDED.site_id,
                        name = EXCLUDED.name
                    """,
                    (row.get("employee_id"), row.get("site_id"), row.get("name")),
                )
                certs = [c.strip() for c in (row.get("certs") or "").split(",") if c.strip()]
                if certs:
                    cursor.execute("DELETE FROM employee_certs WHERE employee_id = %s", (row.get("employee_id"),))
                    for cert in certs:
                        cursor.execute(
                            """
                            INSERT INTO employee_certs (employee_id, cert)
                            VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                            """,
                            (row.get("employee_id"), cert),
                        )
            elif kind == "schedules":
                cursor.execute(
                    """
                    INSERT INTO maintenance_schedule (site_id, equipment_uid, next_date, required_certs, est_duration_min)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        row.get("site_id"),
                        row.get("equipment_uid"),
                        row.get("next_date"),
                        [c.strip() for c in (row.get("required_certs") or "").split(",") if c.strip()],
                        int(row.get("est_duration_min") or 60),
                    ),
                )
            elif kind == "inventory":
                cursor.execute(
                    """
                    INSERT INTO inventory (site_id, part_id, part_name, qty, reorder_level)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (site_id, part_id) DO UPDATE SET
                        part_name = EXCLUDED.part_name,
                        qty = EXCLUDED.qty,
                        reorder_level = EXCLUDED.reorder_level
                    """,
                    (
                        row.get("site_id"),
                        row.get("part_id"),
                        row.get("part_name"),
                        int(row.get("qty") or 0),
                        int(row.get("reorder_level") or 0),
                    ),
                )
            inserted += 1
        conn.commit()

    return {"status": "ok", "rows": inserted}


@app.post("/ingest/docs")
def ingest_docs(
    files: list[UploadFile] = File(...),
    doc_type: str = "manual",
    site_id: Optional[str] = None,
    equipment_uid: Optional[str] = None,
) -> dict:
    if doc_type not in {"manual", "preventive"}:
        raise HTTPException(status_code=400, detail="doc_type must be manual or preventive")

    results = []
    with get_conn() as conn:
        for upload in files:
            raw = upload.file.read()
            text = load_text_from_bytes(upload.filename or "document", raw)
            if not text.strip():
                results.append({"source": upload.filename, "status": "empty"})
                continue
            stored = store_document(
                conn,
                text,
                doc_type=doc_type,
                site_id=site_id,
                equipment_uid=equipment_uid,
                source_name=upload.filename or "document",
            )
            results.append({"source": upload.filename, **stored})

    return {"status": "ok", "results": results}
