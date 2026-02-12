"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { WorkOrder } from "@/lib/types";
import { WorkOrdersTable } from "@/components/WorkOrdersTable";
import { WorkOrderDetails } from "@/components/WorkOrderDetails";
import { Filter, RefreshCw } from "lucide-react";

const STATUS_OPTIONS = [
  "All",
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
  "IN_PROGRESS",
  "DONE",
  "REJECTED",
];

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [siteFilter, setSiteFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWorkOrders(
        siteFilter || undefined,
        statusFilter !== "All" ? statusFilter : undefined
      );
      setWorkOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch work orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [siteFilter, statusFilter]);

  const handleUpdate = () => {
    setSelectedWorkOrder(null);
    fetchWorkOrders();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Work Orders</h1>
        <p className="text-sm text-muted-foreground">
          View and manage maintenance work orders
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Site ID
            </label>
            <input
              type="text"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              placeholder="Filter by site..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchWorkOrders}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center rounded-lg border">
          <div className="text-sm text-muted-foreground">Loading work orders...</div>
        </div>
      ) : (
        <WorkOrdersTable
          workOrders={workOrders}
          onSelect={setSelectedWorkOrder}
        />
      )}

      {/* Details Drawer */}
      {selectedWorkOrder && (
        <WorkOrderDetails
          workOrder={selectedWorkOrder}
          onClose={() => setSelectedWorkOrder(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
