import type { Evidence } from "@/lib/types";
import { FileText } from "lucide-react";

interface EvidenceCardProps {
  evidence: Evidence[];
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-card-foreground">
        <FileText className="h-4 w-4" />
        Evidence & Citations
      </h3>
      <div className="space-y-3">
        {evidence.map((ev, idx) => (
          <div key={idx} className="rounded border-l-4 border-l-primary bg-muted/50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-primary">
                {ev.source}
              </span>
              {ev.score !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {(ev.score * 100).toFixed(0)}% match
                </span>
              )}
            </div>
            {ev.section && (
              <div className="mb-1 text-xs text-muted-foreground">
                {ev.section}
              </div>
            )}
            <p className="text-sm text-foreground">{ev.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
