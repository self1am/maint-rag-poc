"use client";

import { useState } from "react";
import type { SuggestedWorkOrder } from "@/lib/types";
import { api, getUserContext } from "@/lib/api";
import { X, Calendar, Wrench, AlertCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface WorkOrderDialogProps {
  suggestion: SuggestedWorkOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export function WorkOrderDialog({
  suggestion,
  onClose,
  onSuccess,
}: WorkOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { userId } = getUserContext();
      const result = await api.createWorkOrder({
        ...suggestion,
        created_by: userId,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create work order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Create Work Order
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-4 w-4 text-primary" />
              Work Order Details
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site:</span>
                <span className="font-medium">{suggestion.site_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipment:</span>
                <span className="font-medium">{suggestion.equipment_uid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Type:</span>
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {suggestion.job_type}
                </span>
              </div>
            </div>
          </div>

          {(suggestion.planned_start || suggestion.planned_end) && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                Planned Schedule
              </div>
              <div className="space-y-2 text-sm">
                {suggestion.planned_start && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start:</span>
                    <span className="font-medium">
                      {formatDateTime(suggestion.planned_start)}
                    </span>
                  </div>
                )}
                {suggestion.planned_end && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">End:</span>
                    <span className="font-medium">
                      {formatDateTime(suggestion.planned_end)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {suggestion.employee_id && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="mb-2 text-sm font-medium">Assigned Employee</div>
              <div className="text-sm font-medium text-primary">
                {suggestion.employee_id}
              </div>
            </div>
          )}

          {suggestion.required_certs && suggestion.required_certs.length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="mb-2 text-sm font-medium">Required Certifications</div>
              <div className="flex flex-wrap gap-1">
                {suggestion.required_certs.map((cert) => (
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

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Work Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
