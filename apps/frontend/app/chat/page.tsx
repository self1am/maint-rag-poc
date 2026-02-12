"use client";

import { useState } from "react";
import { ChatThread } from "@/components/ChatThread";
import { WorkOrderDialog } from "@/components/WorkOrderDialog";
import { api } from "@/lib/api";
import type { ChatResponse, DateRange } from "@/lib/types";
import { Filter, Zap, CheckCircle } from "lucide-react";

const QUICK_ACTIONS = [
  "Next maintenance for selected equipment",
  "Maintenance due this week",
  "Find available qualified employee",
  "Check spare part availability",
];

export default function ChatPage() {
  const [siteId, setSiteId] = useState<string>("SITE-001");
  const [equipmentUid, setEquipmentUid] = useState<string>("EQ-100");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [workOrderSuggestion, setWorkOrderSuggestion] = useState<ChatResponse | null>(null);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSendMessage = async (message: string): Promise<ChatResponse> => {
    return api.chat({
      message,
      site_id: siteId || undefined,
      equipment_uid: equipmentUid || undefined,
      date_range: dateRange,
    });
  };

  const handleWorkOrderSuggested = (response: ChatResponse) => {
    setWorkOrderSuggestion(response);
  };

  const handleQuickAction = (action: string) => {
    // This will trigger the chat thread to send the message
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (input) {
      input.value = action;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const sendButton = input.nextElementSibling as HTMLButtonElement;
      sendButton?.click();
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        <ChatThread
          onSendMessage={handleSendMessage}
          onWorkOrderSuggested={handleWorkOrderSuggested}
        />
      </div>

      {/* Context Panel */}
      <div className="w-80 border-l bg-muted/30 p-4">
        <div className="space-y-6">
          {/* Filters */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4" />
              Context Filters
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Site
                </label>
                <input
                  type="text"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  placeholder="e.g., SITE-001"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Equipment
                </label>
                <input
                  type="text"
                  value={equipmentUid}
                  onChange={(e) => setEquipmentUid(e.target.value)}
                  placeholder="e.g., EQ-100"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Date Range
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const today = new Date();
                      const nextWeek = new Date(today);
                      nextWeek.setDate(today.getDate() + 7);
                      setDateRange({
                        start: today.toISOString().split("T")[0],
                        end: nextWeek.toISOString().split("T")[0],
                      });
                    }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {dateRange
                      ? `${dateRange.start} to ${dateRange.end}`
                      : "This week"}
                  </button>
                  {dateRange && (
                    <button
                      onClick={() => setDateRange(undefined)}
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4" />
              Quick Actions
            </div>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs font-medium text-primary hover:bg-primary/10"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Work Order Action */}
          {workOrderSuggestion?.suggested_work_order && (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700">
                <CheckCircle className="h-4 w-4" />
                Suggested Action
              </div>
              <button
                onClick={() => setShowWorkOrderDialog(true)}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                Create Work Order
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                Based on the conversation, a work order draft is ready.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Work Order Dialog */}
      {showWorkOrderDialog && workOrderSuggestion?.suggested_work_order && (
        <WorkOrderDialog
          suggestion={workOrderSuggestion.suggested_work_order}
          onClose={() => setShowWorkOrderDialog(false)}
          onSuccess={() => showToast("Work order created successfully!")}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
