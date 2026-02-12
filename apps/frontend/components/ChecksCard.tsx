import type { Checks } from "@/lib/types";
import { Calendar, Users, Package, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ChecksCardProps {
  checks: Checks;
}

export function ChecksCard({ checks }: ChecksCardProps) {
  if (!checks) return null;

  const hasChecks =
    checks.schedule || checks.employees?.length || checks.inventory?.length;

  if (!hasChecks) return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-card-foreground">
        System Checks
      </h3>
      <div className="space-y-4">
        {checks.schedule && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Maintenance Schedule
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipment:</span>
                <span className="font-medium">
                  {checks.schedule.equipment_uid}
                </span>
              </div>
              {checks.schedule.next_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Date:</span>
                  <span className="font-medium">
                    {formatDate(checks.schedule.next_date)}
                  </span>
                </div>
              )}
              {checks.schedule.est_duration_min && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">
                    {checks.schedule.est_duration_min} min
                  </span>
                </div>
              )}
              {checks.schedule.required_certs &&
                checks.schedule.required_certs.length > 0 && (
                  <div className="mt-2">
                    <span className="text-muted-foreground">
                      Required Certs:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {checks.schedule.required_certs.map((cert) => (
                        <span
                          key={cert}
                          className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {checks.employees && checks.employees.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Qualified Employees ({checks.employees.length})
            </div>
            <div className="space-y-2">
              {checks.employees.map((emp) => (
                <div
                  key={emp.employee_id}
                  className="flex items-center justify-between rounded border bg-background p-2"
                >
                  <div className="text-sm">
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {emp.employee_id}
                    </div>
                  </div>
                  {emp.conflicts && emp.conflicts.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      {emp.conflicts.length} conflict(s)
                    </div>
                  ) : (
                    <div className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Available
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {checks.inventory && checks.inventory.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Package className="h-4 w-4 text-primary" />
              Inventory Status
            </div>
            <div className="space-y-2">
              {checks.inventory.map((item) => (
                <div
                  key={item.part_id}
                  className="flex items-center justify-between rounded border bg-background p-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {item.part_name || item.part_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.part_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={
                        item.qty <= (item.reorder_level || 0)
                          ? "font-semibold text-orange-600"
                          : "font-medium text-foreground"
                      }
                    >
                      Qty: {item.qty}
                    </div>
                    {item.reorder_level !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Reorder: {item.reorder_level}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
