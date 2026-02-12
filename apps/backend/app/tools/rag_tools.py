import os
from typing import Optional

import psycopg
from psycopg.rows import dict_row

from app.ingest.embed import embed_texts

USE_OPENAI = os.getenv("USE_OPENAI", "false").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

try:
    from openai import OpenAI
except Exception:  # pragma: no cover - optional dependency in mock mode
    OpenAI = None


def retrieve_chunks(
    conn: psycopg.Connection,
    query: str,
    doc_type: str,
    site_id: Optional[str],
    equipment_uid: Optional[str],
    limit: int = 5,
) -> list[dict]:
    conn.row_factory = dict_row
    vector = embed_texts([query])[0]
    where = ["doc_type = %s"]
    params: list = [doc_type]
    if site_id:
        where.append("site_id = %s")
        params.append(site_id)
    if equipment_uid:
        where.append("equipment_uid = %s")
        params.append(equipment_uid)

    sql = f"""
        SELECT source_name, section, content,
               1 - (embedding <=> %s) AS score
        FROM doc_chunks
        WHERE {" AND ".join(where)}
        ORDER BY embedding <=> %s
        LIMIT {limit}
    """
    rows = conn.execute(sql, [vector] + params + [vector]).fetchall()

    evidence = []
    for row in rows:
        evidence.append(
            {
                "source": row["source_name"],
                "section": row["section"],
                "score": float(row["score"]),
                "snippet": row["content"][:500],
            }
        )
    return evidence


def generate_answer(query: str, evidence: list[dict]) -> str:
    if not evidence:
        return "No matching documentation was found for that request."

    if USE_OPENAI and OPENAI_API_KEY and OpenAI is not None:
        client = OpenAI(api_key=OPENAI_API_KEY)
        context = "\n\n".join([f"{e['source']} - {e.get('section')}: {e['snippet']}" for e in evidence])
        prompt = (
            "Answer the question using only the provided documentation snippets. "
            "If the answer is not present, say you cannot find it.\n\n"
            f"Question: {query}\n\nDocumentation:\n{context}"
        )
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return resp.choices[0].message.content.strip()

    return "Based on the documentation, here is the most relevant excerpt: " + evidence[0]["snippet"]
