"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import {
  Database,
  Upload,
  FileText,
  Users,
  Calendar,
  Package,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function DataHealthPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvKind, setCsvKind] = useState<string>("employees");
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState<string>("manual");
  const [docSiteId, setDocSiteId] = useState<string>("");
  const [docEquipmentUid, setDocEquipmentUid] = useState<string>("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const [docResult, setDocResult] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvResult(null);
    try {
      const result = await api.ingestCSV(csvKind, csvFile);
      setCsvResult(`✓ Successfully ingested ${result.rows} rows`);
      setCsvFile(null);
    } catch (err) {
      setCsvResult(`✗ Error: ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleDocUpload = async () => {
    if (docFiles.length === 0) return;
    setDocLoading(true);
    setDocResult(null);
    try {
      const result = await api.ingestDocs(
        docFiles,
        docType,
        docSiteId || undefined,
        docEquipmentUid || undefined
      );
      const totalChunks = result.results.reduce((sum, r) => sum + (r.chunks || 0), 0);
      setDocResult(`✓ Processed ${docFiles.length} file(s), created ${totalChunks} chunks`);
      setDocFiles([]);
    } catch (err) {
      setDocResult(`✗ Error: ${err instanceof Error ? err.message : "Upload failed"}`);
    } finally {
      setDocLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      await api.seed();
      setSeedResult("✓ Demo data seeded successfully");
    } catch (err) {
      setSeedResult(`✗ Error: ${err instanceof Error ? err.message : "Seed failed"}`);
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Data Health</h1>
        <p className="text-sm text-muted-foreground">
          Manage data ingestion and view system health
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Stats Cards */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">Employees</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">Schedules</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">Inventory Items</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">--</div>
              <div className="text-xs text-muted-foreground">Doc Chunks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Seed Demo Data */}
      <div className="mt-6 rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Quick Start</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Initialize the database with sample data for demo purposes.
        </p>
        <button
          onClick={handleSeedDemo}
          disabled={seedLoading}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {seedLoading ? "Seeding..." : "Seed Demo Data"}
        </button>
        {seedResult && (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm ${
              seedResult.startsWith("✓")
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {seedResult}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* CSV Upload */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Upload CSV Data</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Data Type
              </label>
              <select
                value={csvKind}
                onChange={(e) => setCsvKind(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="employees">Employees</option>
                <option value="schedules">Maintenance Schedules</option>
                <option value="inventory">Inventory</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleCSVUpload}
              disabled={!csvFile || csvLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {csvLoading ? "Uploading..." : "Upload CSV"}
            </button>
            {csvResult && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  csvResult.startsWith("✓")
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {csvResult}
              </div>
            )}
          </div>
        </div>

        {/* Document Upload */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Upload Documents</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="manual">Manual</option>
                <option value="preventive">Preventive Maintenance</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Site ID (optional)
                </label>
                <input
                  type="text"
                  value={docSiteId}
                  onChange={(e) => setDocSiteId(e.target.value)}
                  placeholder="SITE-001"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Equipment UID (optional)
                </label>
                <input
                  type="text"
                  value={docEquipmentUid}
                  onChange={(e) => setDocEquipmentUid(e.target.value)}
                  placeholder="EQ-100"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Documents (PDF, DOCX, TXT)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                multiple
                onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {docFiles.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {docFiles.length} file(s) selected
                </div>
              )}
            </div>
            <button
              onClick={handleDocUpload}
              disabled={docFiles.length === 0 || docLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {docLoading ? "Processing..." : "Upload Documents"}
            </button>
            {docResult && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  docResult.startsWith("✓")
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {docResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-lg border bg-muted/50 p-6">
        <h3 className="mb-3 text-sm font-semibold">CSV Format Requirements</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong>Employees:</strong> employee_id, site_id, name, certs (comma-separated)
          </div>
          <div>
            <strong>Schedules:</strong> site_id, equipment_uid, next_date (YYYY-MM-DD),
            required_certs (comma-separated), est_duration_min
          </div>
          <div>
            <strong>Inventory:</strong> site_id, part_id, part_name, qty, reorder_level
          </div>
        </div>
      </div>
    </div>
  );
}
