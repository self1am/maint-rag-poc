from io import BytesIO

import pdfplumber
from docx import Document


def load_text_from_bytes(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return _load_pdf(data)
    if name.endswith(".docx"):
        return _load_docx(data)
    return data.decode(errors="ignore")


def _load_pdf(data: bytes) -> str:
    text_parts = []
    with pdfplumber.open(BytesIO(data)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts)


def _load_docx(data: bytes) -> str:
    doc = Document(BytesIO(data))
    return "\n".join([p.text for p in doc.paragraphs])
