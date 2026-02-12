"use client";

import type { WorkOrder } from "@/lib/types";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { Eye } from "lucide-react";

interface WorkOrdersTableProps {
  workOrders: WorkOrder[];
  onSelect: (wo: WorkOrder) => void;
}

export function WorkOrdersTable({ workOrders, onSelect }: WorkOrdersTableProps) {
  if (workOrders.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No work orders found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Site
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Equipment
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Job Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Created
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y bg-white">
          {workOrders.map((wo) => (
            <tr
              key={wo.work_order_id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-3 text-sm font-medium">
                #{wo.work_order_id}
              </td>
              <td className="px-4 py-3 text-sm">{wo.site_id}</td>
              <td className="px-4 py-3 text-sm">{wo.equipment_uid}</td>
              <td className="px-4 py-3">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {wo.job_type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                    wo.status
                  )}`}
                >
                  {wo.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDateTime(wo.created_at)}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onSelect(wo)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <Eye className="h-3 w-3" />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
