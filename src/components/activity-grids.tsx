"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AuditEvent, Purchase } from "@/db/schema";
import { money } from "@/lib/format";
import { ReceiptLedger } from "./receipt-ledger";

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  foregroundColor: "var(--ink)",
  backgroundColor: "var(--surface)",
  headerBackgroundColor: "var(--paper-sunken)",
  headerTextColor: "var(--ink-2)",
  headerFontWeight: 600,
  borderColor: "var(--line)",
  accentColor: "var(--petrol)",
  rowHoverColor: "var(--paper)",
  wrapperBorderRadius: 16,
  rowVerticalPaddingScale: 1.25,
});

const eventText: Record<string, string> = {
  "run.started": "Task started",
  "run.finished": "Task finished",
  "run.failed": "Task failed",
  "agent.search": "Agent searched",
  "agent.question": "Agent asked",
  "person.reply": "You replied",
  "purchase.proposed": "Purchase proposed",
  "purchase.approved": "You approved",
  "purchase.rejected": "Declined",
  "purchase.paid": "Paid via PayPal",
  "purchase.failed": "Payment failed",
  "purchase.refunded": "Refunded",
  "mandate.activated": "Rules activated",
  "wallet.connected": "Wallet connected",
};

export function ActivityGrids({ purchases, events }: { purchases: Purchase[]; events: AuditEvent[] }) {
  const [tab, setTab] = useState<"receipts" | "audit">("receipts");

  const auditCols = useMemo<ColDef<AuditEvent>[]>(
    () => [
      { field: "createdAt", headerName: "When", width: 170, sort: "desc", valueFormatter: (p) => when(p.value, true) },
      { field: "type", headerName: "Event", width: 190, valueFormatter: (p) => eventText[p.value] ?? p.value },
      { headerName: "Details", flex: 1, minWidth: 300, valueGetter: (p) => (p.data ? details(p.data) : "") },
      {
        field: "runId",
        headerName: "Task",
        width: 110,
        cellRenderer: (p: ICellRendererParams<AuditEvent>) =>
          p.value ? (
            <Link href={`/runs/${p.value}`} className="font-semibold text-petrol hover:underline">
              Open
            </Link>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div>
      <div role="tablist" aria-label="Activity views" className="inline-flex rounded-full bg-paper-sunken p-1 ring-1 ring-line">
        {(["receipts", "audit"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="rounded-full px-4 py-1.5 text-[0.9rem] font-semibold text-ink-2 transition-colors aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-[0_1px_2px_oklch(0.245_0.032_228/0.12)]"
          >
            {t === "receipts" ? `Receipts (${purchases.length})` : `Audit log (${events.length})`}
          </button>
        ))}
      </div>

      {tab === "receipts" ? (
        <div className="mt-8">
          <ReceiptLedger purchases={purchases} />
        </div>
      ) : (
        <div className="mt-5 h-[34rem]">
          <AgGridReact<AuditEvent>
            theme={theme}
            rowData={events}
            columnDefs={auditCols}
            getRowId={(p) => p.data.id}
            defaultColDef={{ sortable: true, filter: true, resizable: true }}
            overlayNoRowsTemplate="Nothing has happened yet."
          />
        </div>
      )}
    </div>
  );
}

function when(value: Date | string, seconds = false) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
  });
}

function details(e: AuditEvent): string {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case "run.started":
      return `“${p.task}”${p.mode === "compromised" ? " (compromised simulation)" : ""}`;
    case "agent.search":
      return `“${p.query}”, ${(p.results as unknown[]).length} results`;
    case "agent.question":
      return String(p.question);
    case "person.reply":
      return `“${p.text}”`;
    case "purchase.proposed":
      return `${money(Number(p.totalCents))}: policy said ${String(p.decision)}`;
    case "purchase.paid":
      return `${money(Number(p.totalCents))}, PayPal order ${p.paypalOrderId}`;
    case "purchase.refunded":
      return `${money(Number(p.totalCents))} back to your wallet`;
    case "purchase.failed":
      return String(p.reason);
    case "purchase.rejected":
      return p.by === "policy" ? `Re-checked and refused: ${(p.reasons as string[]).join(" ")}` : "By you";
    case "run.failed":
      return String(p.error);
    case "run.finished":
      return String(p.summary ?? "").replace(/\*\*/g, "").slice(0, 160);
    case "wallet.connected":
      return String(p.payerEmail ?? "");
    default:
      return "";
  }
}
