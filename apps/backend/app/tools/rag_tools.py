from typing import Optional

import psycopg
from psycopg.rows import dict_row

from app.ingest.embed import embed_texts
from app.llm import get_llm


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
        where.append("(site_id = %s OR site_id IS NULL)")
        params.append(site_id)
    if equipment_uid:
        where.append("(equipment_uid = %s OR equipment_uid IS NULL)")
        params.append(equipment_uid)

    sql = f"""
        SELECT source_name, section, content,
               1 - (embedding <=> %s::vector) AS score
        FROM doc_chunks
        WHERE {" AND ".join(where)}
        ORDER BY embedding <=> %s::vector
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
    """Generate an answer using LLM based on retrieved evidence."""
    if not evidence:
        return "No matching documentation was found for that request."

    try:
        llm = get_llm()
        
        # Build context from evidence
        context = "\n\n".join([
            f"[Source: {e['source']}{' - ' + e.get('section', '') if e.get('section') else ''}]\n{e['snippet']}"
            for e in evidence
        ])
        
        prompt = f"""You are a maintenance assistant. Answer the question using ONLY the provided documentation snippets.
If the answer is not present in the documentation, say you cannot find it.
Be concise and practical.

Question: {query}

Documentation:
{context}

Answer:"""
        
        return llm.generate_text(prompt, temperature=0.3, max_tokens=500)
    
    except Exception as e:
        # Fallback to simple snippet if LLM fails
        print(f"LLM generation failed: {e}")
        return f"Based on the documentation: {evidence[0]['snippet']}"
