"use client";

import { useState } from "react";
import type { WorkOrder } from "@/lib/types";
import { api, getUserContext } from "@/lib/api";
import { X, Calendar, User, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDateTime, getStatusColor } from "@/lib/utils";

interface WorkOrderDetailsProps {
  workOrder: WorkOrder;
  onClose: () => void;
  onUpdate: () => void;
}

export function WorkOrderDetails({
  workOrder,
  onClose,
  onUpdate,
}: WorkOrderDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { role, userId } = getUserContext();

  const canApprove = role === "admin" && workOrder.status === "PENDING_APPROVAL";

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.approveWorkOrder(workOrder.work_order_id, { admin_id: userId });
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl">
      <div className="sticky top-0 border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Work Order #{workOrder.work_order_id}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Status */}
        <div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
              workOrder.status
            )}`}
          >
            {workOrder.status}
          </span>
        </div>

        {/* Basic Info */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Site:</span>
              <span className="font-medium">{workOrder.site_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipment:</span>
              <span className="font-medium">{workOrder.equipment_uid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Job Type:</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {workOrder.job_type}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule */}
        {(workOrder.planned_start || workOrder.planned_end) && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" />
              Planned Schedule
            </div>
            <div className="space-y-2 text-sm">
              {workOrder.planned_start && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-medium">
                    {formatDateTime(workOrder.planned_start)}
                  </span>
                </div>
              )}
              {workOrder.planned_end && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-medium">
                    {formatDateTime(workOrder.planned_end)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignment */}
        {workOrder.employee_id && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" />
              Assigned Employee
            </div>
            <div className="rounded-lg border bg-muted/50 p-3 text-sm font-medium">
              {workOrder.employee_id}
            </div>
          </div>
        )}

        {/* Certifications */}
        {workOrder.required_certs && workOrder.required_certs.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Required Certifications</h3>
            <div className="flex flex-wrap gap-2">
              {workOrder.required_certs.map((cert) => (
                <span
                  key={cert}
                  className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            Timeline
          </div>
          <div className="space-y-3 border-l-2 border-muted pl-4">
            <div>
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="text-sm font-medium">
                {formatDateTime(workOrder.created_at)}
              </div>
              <div className="text-xs text-muted-foreground">
                by {workOrder.created_by}
              </div>
            </div>
            {workOrder.approved_by && (
              <div>
                <div className="text-xs text-muted-foreground">Approved</div>
                <div className="text-sm font-medium">
                  {formatDateTime(workOrder.updated_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  by {workOrder.approved_by}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Actions */}
        {canApprove && (
          <div className="space-y-2 pt-4">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? "Approving..." : "Approve Work Order"}
            </button>
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
