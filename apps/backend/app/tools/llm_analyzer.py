"""
Intelligent document analysis using LLM.
Extracts structured data from unstructured documents.
"""
import json
from typing import Dict, Any, List, Optional

from app.llm import get_llm


def analyze_maintenance_document(content: str, filename: str) -> Dict[str, Any]:
    """
    Analyze a maintenance document and extract structured information.
    Returns equipment, tasks, schedules, employees, etc.
    """
    llm = get_llm()
    
    prompt = f"""Analyze this maintenance document and extract structured information.

Document: {filename}
Content (first 3000 chars):
{content[:3000]}

Extract and return JSON with:
{{
  "document_type": "schedule|manual|procedure|inspection|report",
  "equipment": [
    {{"id": "equipment identifier", "name": "equipment name", "type": "equipment type"}}
  ],
  "tasks": [
    {{
      "description": "task description",
      "equipment_id": "related equipment",
      "date": "scheduled date if mentioned",
      "duration_minutes": estimated duration,
      "required_skills": ["skill1", "skill2"]
    }}
  ],
  "employees": [
    {{"id": "employee identifier", "name": "employee name", "skills": ["skill1"]}}
  ],
  "parts": [
    {{"id": "part id", "name": "part name", "quantity": number}}
  ],
  "dates": ["any important dates mentioned"],
  "notes": "any important observations or special instructions"
}}

Return ONLY valid JSON. If a section has no data, use empty array/null."""
    
    try:
        response = llm.generate_text(prompt, temperature=0.1)
        
        # Strip markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]  # Remove ```json
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]  # Remove ```
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]  # Remove trailing ```
        cleaned = cleaned.strip()
        
        # Try to parse as JSON
        parsed = json.loads(cleaned)
        return parsed
    except json.JSONDecodeError as e:
        print(f"Failed to parse LLM response as JSON: {e}")
        print(f"Response was: {response[:500]}")
        # Return raw response
        return {
            "document_type": "unknown",
            "equipment": [],
            "tasks": [],
            "employees": [],
            "parts": [],
            "dates": [],
            "notes": response[:500],
            "raw_response": response
        }
    except Exception as e:
        print(f"Document analysis failed: {e}")
        return {
            "document_type": "unknown",
            "equipment": [],
            "tasks": [],
            "employees": [],
            "parts": [],
            "dates": [],
            "notes": f"Analysis failed: {str(e)}"
        }


def infer_csv_schema(
    headers: List[str],
    sample_rows: List[List[str]],
    filename: str
) -> Dict[str, Any]:
    """
    Infer the schema and purpose of a CSV file using LLM.
    Returns mapping to internal data structures.
    """
    llm = get_llm()
    
    # Format sample data
    sample_data = "\n".join([
        ", ".join(headers),
        *[", ".join(row) for row in sample_rows[:5]]
    ])
    
    prompt = f"""Analyze this CSV file and determine its purpose and schema.

File: {filename}
Headers: {", ".join(headers)}

Sample rows:
{sample_data}

Our database schema uses these field names:
- employees: employee_id, site_id, name, certifications (array)
- equipment: equipment_uid, site_id, name
- schedules: site_id, equipment_uid, next_date, required_certs (array), est_duration_min
- inventory: site_id, part_id, part_name, qty, reorder_level

Map each CSV column to the correct database field name above.

Return JSON:
{{
  "data_type": "employees|equipment|schedules|inventory|tasks|unknown",
  "column_mapping": {{
    "original_column_name": {{"field": "database_field_name", "type": "string|integer|date|array"}}
  }},
  "transformations": [
    "description of any needed data transformations"
  ],
  "confidence": "high|medium|low"
}}"""
    
    try:
        response = llm.generate_text(prompt, temperature=0.1)
        
        # Strip markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        return json.loads(cleaned)
    except Exception as e:
        print(f"CSV schema inference failed: {e}")
        return {
            "data_type": "unknown",
            "column_mapping": {},
            "transformations": [],
            "confidence": "low",
            "error": str(e)
        }


def suggest_work_order_from_context(
    message: str,
    equipment_id: Optional[str],
    site_id: Optional[str],
    available_employees: List[Dict[str, Any]],
    inventory: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Use LLM to intelligently suggest a work order based on conversation context.
    """
    llm = get_llm()
    
    context_parts = []
    if equipment_id:
        context_parts.append(f"Equipment: {equipment_id}")
    if site_id:
        context_parts.append(f"Site: {site_id}")
    if available_employees:
        emp_list = ", ".join([f"{e['name']} ({e['employee_id']})" for e in available_employees[:5]])
        context_parts.append(f"Available employees: {emp_list}")
    if inventory:
        inv_list = ", ".join([f"{i['part_name']} (qty: {i['qty']})" for i in inventory[:5]])
        context_parts.append(f"Inventory: {inv_list}")
    
    context = "\n".join(context_parts) if context_parts else "No context available"
    
    prompt = f"""Based on this user request and context, determine if a work order should be created.

User request: {message}

Context:
{context}

If a work order should be created, return JSON:
{{
  "should_create": true,
  "work_order": {{
    "site_id": "site identifier",
    "equipment_uid": "equipment identifier",
    "job_type": "PREVENTIVE|REPAIR|INSPECTION|GENERAL",
    "description": "clear description of work",
    "priority": "HIGH|MEDIUM|LOW",
    "estimated_duration_hours": number,
    "required_skills": ["skill1", "skill2"],
    "recommended_employee_id": "employee id if one matches well",
    "required_parts": ["part1", "part2"]
  }},
  "reasoning": "why this work order is needed"
}}

If no work order is needed, return:
{{
  "should_create": false,
  "reasoning": "why no work order is needed"
}}"""
    
    try:
        response = llm.generate_text(prompt, temperature=0.2)
        
        # Strip markdown code blocks if present
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        result = json.loads(cleaned)
        return result if result.get("should_create") else None
    except Exception as e:
        print(f"Work order suggestion failed: {e}")
        return None
