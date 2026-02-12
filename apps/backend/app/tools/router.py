from typing import Optional


def route_message(message: str) -> dict:
    text = message.lower()
    return {
        "rag_manual": any(k in text for k in ["manual", "procedure", "step by step", "troubleshoot"]),
        "rag_preventive": any(k in text for k in ["preventive", "solution", "problem"]),
        "schedule": "next maintenance" in text or "schedule" in text,
        "due": any(k in text for k in ["this week", "next 7 days", "due"]),
        "employee": any(k in text for k in ["employee", "assign", "available", "qualified"]),
        "inventory": any(k in text for k in ["spare", "part", "inventory", "available"]),
        "suggest_work_order": any(k in text for k in ["create work order", "assign", "schedule"]),
    }


def guess_job_type(message: str) -> str:
    text = message.lower()
    if "preventive" in text:
        return "PREVENTIVE"
    if "repair" in text or "fix" in text:
        return "REPAIR"
    return "GENERAL"


def extract_part_query(message: str) -> Optional[str]:
    text = message.lower()
    tokens = text.replace("?", " ").replace(",", " ").split()
    if "part" in tokens:
        idx = tokens.index("part")
        if idx + 1 < len(tokens):
            return tokens[idx + 1]
    if "spare" in tokens:
        idx = tokens.index("spare")
        if idx + 1 < len(tokens):
            return tokens[idx + 1]
    return None
