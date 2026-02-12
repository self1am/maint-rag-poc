import uuid
from typing import Optional

from app.ingest.chunking import chunk_text
from app.ingest.embed import embed_texts


def store_document(
    conn,
    text: str,
    doc_type: str,
    site_id: Optional[str],
    equipment_uid: Optional[str],
    source_name: str,
    section: Optional[str] = None,
) -> dict:
    chunks = chunk_text(text)
    vectors = embed_texts(list(chunks))
    doc_id = str(uuid.uuid4())

    if not chunks:
        return {"doc_id": doc_id, "chunks": 0}

    cursor = conn.cursor()
    for content, vector in zip(chunks, vectors):
        cursor.execute(
            """
            INSERT INTO doc_chunks (
                doc_id, doc_type, site_id, equipment_uid,
                source_name, section, content, embedding
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (doc_id, doc_type, site_id, equipment_uid, source_name, section, content, vector),
        )
    conn.commit()
    return {"doc_id": doc_id, "chunks": len(chunks)}
