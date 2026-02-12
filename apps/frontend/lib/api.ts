import type {
  ChatRequest,
  ChatResponse,
  WorkOrder,
  CreateWorkOrderRequest,
  CreateWorkOrderResponse,
  ApproveWorkOrderRequest,
  UserRole,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

let currentRole: UserRole = "user";
let currentUserId: string = "user-001";

export function setUserContext(role: UserRole, userId: string) {
  currentRole = role;
  currentUserId = userId;
}

export function getUserContext() {
  return { role: currentRole, userId: currentUserId };
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  if (MOCK_MODE) {
    return getMockResponse<T>(endpoint, options);
  }

  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("x-user-role", currentRole);
  headers.set("x-user-id", currentUserId);

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// Mock responses for demo mode
function getMockResponse<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (endpoint === "/chat") {
        resolve({
          answer: "This is a mock response. The next maintenance for EQ-100 is scheduled for 2026-02-15. I found 2 qualified employees available.",
          evidence: [
            {
              source: "hydraulic_press_manual.pdf",
              section: "Maintenance Schedule",
              score: 0.89,
              snippet: "Regular maintenance should be performed every 90 days including hydraulic fluid check, pressure test, and safety inspection.",
            },
          ],
          checks: {
            schedule: {
              equipment_uid: "EQ-100",
              next_date: "2026-02-15",
              required_certs: ["HYDRAULICS", "LOCKOUT"],
              est_duration_min: 120,
            },
            employees: [
              {
                employee_id: "EMP-01",
                name: "Avery Chen",
                conflicts: [],
              },
              {
                employee_id: "EMP-02",
                name: "Morgan Lee",
                conflicts: [],
              },
            ],
          },
          suggested_work_order: {
            site_id: "SITE-001",
            equipment_uid: "EQ-100",
            job_type: "PREVENTIVE",
            planned_start: "2026-02-15T08:00:00Z",
            planned_end: "2026-02-15T10:00:00Z",
            required_certs: ["HYDRAULICS", "LOCKOUT"],
            employee_id: "EMP-01",
          },
        } as T);
      } else if (endpoint.startsWith("/workorders") && options?.method !== "POST") {
        if (endpoint.includes("/workorders/")) {
          resolve({
            work_order_id: 1,
            site_id: "SITE-001",
            equipment_uid: "EQ-100",
            job_type: "PREVENTIVE",
            status: "PENDING_APPROVAL",
            created_by: "user-001",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as T);
        } else {
          resolve([
            {
              work_order_id: 1,
              site_id: "SITE-001",
              equipment_uid: "EQ-100",
              job_type: "PREVENTIVE",
              status: "PENDING_APPROVAL",
              created_by: "user-001",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              work_order_id: 2,
              site_id: "SITE-001",
              equipment_uid: "EQ-200",
              job_type: "REPAIR",
              status: "APPROVED",
              created_by: "admin-001",
              approved_by: "admin-001",
              created_at: new Date(Date.now() - 86400000).toISOString(),
              updated_at: new Date().toISOString(),
            },
          ] as T);
        }
      } else if (endpoint === "/workorders/draft") {
        resolve({
          work_order_id: Math.floor(Math.random() * 1000),
          status: currentRole === "admin" ? "APPROVED" : "PENDING_APPROVAL",
        } as T);
      } else if (endpoint.includes("/approve")) {
        resolve({
          work_order_id: parseInt(endpoint.split("/")[2]),
          status: "APPROVED",
        } as T);
      } else if (endpoint === "/seed") {
        resolve({ status: "ok" } as T);
      }
      resolve({} as T);
    }, 300);
  });
}

export const api = {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return fetchAPI<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async getWorkOrders(
    siteId?: string,
    status?: string
  ): Promise<WorkOrder[]> {
    const params = new URLSearchParams();
    if (siteId) params.set("site_id", siteId);
    if (status) params.set("status", status);
    const query = params.toString();
    return fetchAPI<WorkOrder[]>(`/workorders${query ? `?${query}` : ""}`);
  },

  async getWorkOrder(id: number): Promise<WorkOrder> {
    return fetchAPI<WorkOrder>(`/workorders/${id}`);
  },

  async createWorkOrder(
    request: CreateWorkOrderRequest
  ): Promise<CreateWorkOrderResponse> {
    return fetchAPI<CreateWorkOrderResponse>("/workorders/draft", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async approveWorkOrder(
    id: number,
    request: ApproveWorkOrderRequest
  ): Promise<CreateWorkOrderResponse> {
    return fetchAPI<CreateWorkOrderResponse>(`/workorders/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async ingestCSV(kind: string, file: File): Promise<{ status: string; rows: number }> {
    const formData = new FormData();
    formData.append("file", file);

    if (MOCK_MODE) {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ status: "ok", rows: 10 }), 500);
      });
    }

    const headers = new Headers();
    headers.set("x-user-role", currentRole);
    headers.set("x-user-id", currentUserId);

    const response = await fetch(`${API_BASE}/ingest/csv/${kind}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  async ingestDocs(
    files: File[],
    docType: string,
    siteId?: string,
    equipmentUid?: string
  ): Promise<{ status: string; results: any[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const params = new URLSearchParams({ doc_type: docType });
    if (siteId) params.set("site_id", siteId);
    if (equipmentUid) params.set("equipment_uid", equipmentUid);

    if (MOCK_MODE) {
      return new Promise((resolve) => {
        setTimeout(
          () =>
            resolve({
              status: "ok",
              results: files.map((f) => ({ source: f.name, chunks: 12 })),
            }),
          800
        );
      });
    }

    const headers = new Headers();
    headers.set("x-user-role", currentRole);
    headers.set("x-user-id", currentUserId);

    const response = await fetch(`${API_BASE}/ingest/docs?${params}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  },

  async seed(): Promise<{ status: string }> {
    return fetchAPI<{ status: string }>("/seed", { method: "POST" });
  },
};
