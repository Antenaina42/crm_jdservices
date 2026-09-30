"use client";

import React, { useState } from "react";
import {
  PieChart,
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency, formatDateFr } from "@/lib/utils";

interface FinancialDashboardClientProps {
  workspace: any;
  user: any;
  invoices: any[];
  payments: any[];
  workspaceSlug: "automobile" | "network";
}

export default function FinancialDashboardClient({
  workspace,
  user,
  invoices,
  payments,
  workspaceSlug,
}: FinancialDashboardClientProps) {
  const [period, setPeriod] = useState<"ALL" | "YEAR" | "MONTH">("ALL");
  const isAuto = workspaceSlug === "automobile";

  const caHt = invoices.reduce((acc, inv) => acc + inv.totalHt, 0);
  const caTax = invoices.reduce((acc, inv) => acc + inv.totalTax, 0);
  const caTtc = invoices.reduce((acc, inv) => acc + inv.totalTtc, 0);
  const caCollected = payments.reduce((acc, p) => acc + p.amount, 0);
  const caPending = Math.max(0, caTtc - caCollected);

  const exportInvoicesCsv = () => {
    const headers = ["Numéro", "Date", "Client", "Total HT", "TVA", "Total TTC", "Statut"];
    const rows = invoices.map((inv) => [
      inv.documentNumber,
      formatDateFr(inv.date),
      inv.client.companyName || `${inv.client.firstName} ${inv.client.lastName}`,
      inv.totalHt.toFixed(2),
      inv.totalTax.toFixed(2),
      inv.totalTtc.toFixed(2),
      inv.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Factures_${workspaceSlug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Synthèse Financière — {isAuto ? "Import Automobile" : "Accompagnement Réseau"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Indicateurs financiers strictement cloisonnés à {workspace.name}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={exportInvoicesCsv}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-2xs"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Exporter CSV Factures
          </button>
        </div>
      </div>

      {/* BIG METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Chiffre d&apos;Affaires HT</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(caHt)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total hors taxes émis</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">TVA Collectée</div>
          <div className="text-2xl font-black text-slate-700 mt-1">{formatCurrency(caTax)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Régime 20% standard</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total Facturé TTC</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{formatCurrency(caTtc)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{invoices.length} facture(s) émise(s)</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total Encaissé</div>
          <div className="text-2xl font-black text-teal-600 mt-1">{formatCurrency(caCollected)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Règlements validés</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">À Recevoir / Restant</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(caPending)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Encours client</div>
        </div>
      </div>

      {/* DETAIL TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Ventilation des Factures Comptables
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Numéro</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">HT</th>
                <th className="py-3 px-4 text-right">TVA</th>
                <th className="py-3 px-4 text-right">TTC</th>
                <th className="py-3 px-4 text-right">Payé</th>
                <th className="py-3 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune facture enregistrée pour ce workspace.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{inv.documentNumber}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateFr(inv.date)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {inv.client.companyName || `${inv.client.firstName} ${inv.client.lastName}`}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrency(inv.totalHt)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(inv.totalTax)}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(inv.totalTtc)}</td>
                    <td className="py-3 px-4 text-right font-bold text-teal-600">{formatCurrency(inv.totalPaid)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
