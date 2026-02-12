export interface DateRange {
  start: string;
  end: string;
}

export interface Evidence {
  source: string;
  section?: string;
  score?: number;
  snippet: string;
}

export interface ScheduleCheck {
  equipment_uid: string;
  next_date?: string;
  required_certs?: string[];
  est_duration_min?: number;
}

export interface EmployeeCheck {
  employee_id: string;
  name: string;
  conflicts?: any[];
}

export interface InventoryCheck {
  part_id: string;
  part_name?: string;
  qty: number;
  reorder_level?: number;
}

export interface Checks {
  schedule?: ScheduleCheck;
  employees?: EmployeeCheck[];
  inventory?: InventoryCheck[];
}

export interface SuggestedWorkOrder {
  site_id: string;
  equipment_uid: string;
  job_type: string;
  planned_start?: string;
  planned_end?: string;
  required_certs?: string[];
  employee_id?: string;
}

export interface ChatRequest {
  message: string;
  site_id?: string;
  equipment_uid?: string;
  date_range?: DateRange;
}

export interface ChatResponse {
  answer: string;
  evidence?: Evidence[];
  checks?: Checks;
  suggested_work_order?: SuggestedWorkOrder;
}

export interface WorkOrder {
  work_order_id: number;
  site_id: string;
  equipment_uid: string;
  job_type: string;
  planned_start?: string;
  planned_end?: string;
  required_certs?: string[];
  employee_id?: string;
  status: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkOrderRequest extends SuggestedWorkOrder {
  created_by: string;
}

export interface CreateWorkOrderResponse {
  work_order_id: number;
  status: string;
}

export interface ApproveWorkOrderRequest {
  admin_id: string;
}

export type UserRole = "admin" | "user";

export interface Site {
  site_id: string;
  name: string;
}

export interface Equipment {
  equipment_uid: string;
  site_id: string;
  name: string;
}
