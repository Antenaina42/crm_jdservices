"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Plus,
  Search,
  ArrowRight,
  Printer,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Receipt,
  FileCheck,
} from "lucide-react";
import { formatCurrency, formatDateFr } from "@/lib/utils";

interface DocumentListPageProps {
  workspace: any;
  user: any;
  initialDocuments: any[];
  documentType: "PROFORMA" | "INVOICE" | "CREDIT_NOTE";
  workspaceSlug: "automobile" | "network";
}

export default function DocumentListPage({
  workspace,
  user,
  initialDocuments,
  documentType,
  workspaceSlug,
}: DocumentListPageProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const isAuto = workspaceSlug === "automobile";
  const isProforma = documentType === "PROFORMA";
  const basePath = `/${workspaceSlug}/${isProforma ? "proformas" : "invoices"}`;

  const title = isProforma
    ? isAuto
      ? "Factures Proformas Automobiles"
      : "Factures Proformas Réseau & IT"
    : isAuto
    ? "Factures Comptables Automobiles"
    : "Factures Comptables Réseau";

  const filteredDocs = documents.filter((d) => {
    const clientName = d.client.isCompany && d.client.companyName
      ? d.client.companyName
      : `${d.client.firstName} ${d.client.lastName}`.trim();

    const matchesSearch =
      d.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
              {documents.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isProforma
              ? "Documents commerciaux préalables à la facture comptable définitive"
              : "Factures émises légalement et immuables avec traçabilité d'audit"}
          </p>
        </div>

        {isProforma && (
          <Link
            href={`${basePath}/new`}
            className={`inline-flex items-center px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition ${
              isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
            }`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {isAuto ? "Nouvelle Proforma Auto" : "Nouvelle Proforma Réseau"}
          </Link>
        )}
      </div>

      {/* Search and status filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher numéro, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tous ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("SENT")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "SENT" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Envoyées
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACCEPTED")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "ACCEPTED" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Acceptées / Signées
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "PAID" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Payées
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Numéro</th>
                <th className="py-3 px-4">Date Émission</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Total HT</th>
                <th className="py-3 px-4 text-right">TVA</th>
                <th className="py-3 px-4 text-right">Total TTC</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun document trouvé.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const clientName = doc.client.isCompany && doc.client.companyName
                    ? doc.client.companyName
                    : `${doc.client.firstName} ${doc.client.lastName}`.trim();

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`${basePath}/${doc.id}`}
                          className="font-black text-slate-900 hover:text-blue-600 transition block text-sm"
                        >
                          {doc.documentNumber}
                        </Link>
                        {doc.isImmutable && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center mt-0.5">
                            <ShieldCheck className="w-3 h-3 mr-0.5 text-emerald-600" />
                            Verrouillé / Immuable
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatDateFr(doc.date)}
                        {doc.dueDate && (
                          <div className="text-[10px] text-slate-400">Éch : {formatDateFr(doc.dueDate)}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/${workspaceSlug}/clients/${doc.client.id}`}
                          className="font-bold text-slate-800 hover:underline"
                        >
                          {clientName}
                        </Link>
                        <div className="text-[10px] text-slate-400">{doc.client.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(doc.totalHt)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        {formatCurrency(doc.totalTax)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(doc.totalTtc)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === "PAID"
                              ? "bg-teal-50 text-teal-800 border border-teal-200"
                              : doc.status === "ACCEPTED" || doc.status === "SIGNED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : doc.status === "SENT"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`${basePath}/${doc.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-2xs"
                        >
                          Consulter <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
