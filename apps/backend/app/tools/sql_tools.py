from datetime import datetime
from typing import Any, Optional

import psycopg
from psycopg.rows import dict_row


def _dict_conn(conn: psycopg.Connection) -> psycopg.Connection:
    conn.row_factory = dict_row
    return conn


def get_next_maintenance(conn: psycopg.Connection, equipment_uid: str) -> Optional[dict]:
    _dict_conn(conn)
    row = conn.execute(
        """
        SELECT equipment_uid, next_date, required_certs, est_duration_min
        FROM maintenance_schedule
        WHERE equipment_uid = %s
        ORDER BY next_date ASC
        LIMIT 1
        """,
        (equipment_uid,),
    ).fetchone()
    return row


def list_due_maintenance(conn: psycopg.Connection, site_id: str, start_date: str, end_date: str) -> list[dict]:
    _dict_conn(conn)
    rows = conn.execute(
        """
        SELECT equipment_uid, next_date, required_certs, est_duration_min
        FROM maintenance_schedule
        WHERE site_id = %s AND next_date BETWEEN %s AND %s
        ORDER BY next_date ASC
        """,
        (site_id, start_date, end_date),
    ).fetchall()
    return rows


def find_qualified_employees(conn: psycopg.Connection, site_id: str, required_certs: list[str]) -> list[dict]:
    _dict_conn(conn)
    if not required_certs:
        rows = conn.execute(
            """
            SELECT employee_id, name
            FROM employees
            WHERE site_id = %s
            ORDER BY name
            """,
            (site_id,),
        ).fetchall()
        return rows

    rows = conn.execute(
        """
        SELECT e.employee_id, e.name
        FROM employees e
        JOIN employee_certs ec ON ec.employee_id = e.employee_id
        WHERE e.site_id = %s AND ec.cert = ANY(%s)
        GROUP BY e.employee_id, e.name
        HAVING COUNT(DISTINCT ec.cert) = %s
        ORDER BY e.name
        """,
        (site_id, required_certs, len(required_certs)),
    ).fetchall()
    return rows


def check_employee_conflicts(
    conn: psycopg.Connection,
    employee_id: str,
    start_ts: datetime,
    end_ts: datetime,
) -> list[dict]:
    _dict_conn(conn)
    rows = conn.execute(
        """
        SELECT assignment_id, work_order_id, start_ts, end_ts
        FROM assignments
        WHERE employee_id = %s
          AND tstzrange(start_ts, end_ts, '[]') && tstzrange(%s, %s, '[]')
        ORDER BY start_ts
        """,
        (employee_id, start_ts, end_ts),
    ).fetchall()
    return rows


def check_inventory(conn: psycopg.Connection, site_id: str, part_id_or_name: str) -> list[dict]:
    _dict_conn(conn)
    rows = conn.execute(
        """
        SELECT part_id, part_name, qty, reorder_level
        FROM inventory
        WHERE site_id = %s AND (part_id ILIKE %s OR part_name ILIKE %s)
        ORDER BY part_id
        """,
        (site_id, f"%{part_id_or_name}%", f"%{part_id_or_name}%"),
    ).fetchall()
    return rows


def create_work_order(
    conn: psycopg.Connection,
    payload: dict,
    require_approval: bool,
    actor_role: str,
    actor_id: str,
) -> dict:
    status = "APPROVED" if actor_role == "admin" and not require_approval else "PENDING_APPROVAL"
    approved_by = actor_id if status == "APPROVED" else None

    row = conn.execute(
        """
        INSERT INTO work_orders (
            site_id, equipment_uid, job_type, planned_start, planned_end,
            required_certs, employee_id, status, created_by, approved_by
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING work_order_id, status
        """,
        (
            payload["site_id"],
            payload["equipment_uid"],
            payload["job_type"],
            payload.get("planned_start"),
            payload.get("planned_end"),
            payload.get("required_certs", []),
            payload.get("employee_id"),
            status,
            actor_id,
            approved_by,
        ),
    ).fetchone()

    if status == "APPROVED" and payload.get("employee_id") and payload.get("planned_start") and payload.get("planned_end"):
        conn.execute(
            """
            INSERT INTO assignments (work_order_id, employee_id, start_ts, end_ts)
            VALUES (%s, %s, %s, %s)
            """,
            (row[0], payload["employee_id"], payload["planned_start"], payload["planned_end"]),
        )

    conn.commit()
    return {"work_order_id": row[0], "status": row[1]}


def approve_work_order(conn: psycopg.Connection, work_order_id: int, admin_id: str) -> dict:
    row = conn.execute(
        """
        UPDATE work_orders
        SET status = 'APPROVED', approved_by = %s, updated_at = NOW()
        WHERE work_order_id = %s
        RETURNING work_order_id, status
        """,
        (admin_id, work_order_id),
    ).fetchone()
    conn.commit()
    if not row:
        return {"work_order_id": work_order_id, "status": "NOT_FOUND"}
    return {"work_order_id": row[0], "status": row[1]}


def get_work_orders(conn: psycopg.Connection, site_id: Optional[str], status: Optional[str]) -> list[dict]:
    _dict_conn(conn)
    if site_id and status:
        rows = conn.execute(
            """
            SELECT * FROM work_orders WHERE site_id = %s AND status = %s
            ORDER BY created_at DESC
            """,
            (site_id, status),
        ).fetchall()
    elif site_id:
        rows = conn.execute(
            """
            SELECT * FROM work_orders WHERE site_id = %s
            ORDER BY created_at DESC
            """,
            (site_id,),
        ).fetchall()
    elif status:
        rows = conn.execute(
            """
            SELECT * FROM work_orders WHERE status = %s
            ORDER BY created_at DESC
            """,
            (status,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT * FROM work_orders
            ORDER BY created_at DESC
            """
        ).fetchall()
    return rows


def get_work_order(conn: psycopg.Connection, work_order_id: int) -> Optional[dict]:
    _dict_conn(conn)
    row = conn.execute(
        """
        SELECT * FROM work_orders WHERE work_order_id = %s
        """,
        (work_order_id,),
    ).fetchone()
    return row
