"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  FileText,
  Upload,
  Download,
  Trash2,
  Lock,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import { formatDateFr } from "@/lib/utils";

interface DocumentStorageManagerClientProps {
  workspace: any;
  user: any;
  documents: any[];
  workspaceSlug: "automobile" | "network";
}

export default function DocumentStorageManagerClient({
  workspace,
  user,
  documents,
  workspaceSlug,
}: DocumentStorageManagerClientProps) {
  const [search, setSearch] = useState("");
  const isAuto = workspaceSlug === "automobile";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Gestion Documentaire &amp; Archivage — {isAuto ? "Automobile" : "Réseau"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Archivage probant légal (10 ans) des pièces comptables, contrats et justificatifs
          </p>
        </div>
      </div>

      {/* Storage notice banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">Conservation Légale 10 Ans &amp; Scellement d&apos;Intégrité</div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Code de commerce Art. L123-22 : Toutes les factures émises et justificatifs comptables sont horodatés et scellés cryptographiquement.
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Documents Enregistrés ({documents.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4">Type Document</th>
                <th className="py-3 px-4">Client Rattaché</th>
                <th className="py-3 px-4">Date de Création</th>
                <th className="py-3 px-4">Intégrité Hash</th>
                <th className="py-3 px-4 text-center">Rétention</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Aucun document archivé.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const clientName = doc.client?.companyName || `${doc.client?.firstName || ""} ${doc.client?.lastName || ""}`.trim();
                  const viewUrl = `/${workspaceSlug}/${doc.documentType === "PROFORMA" ? "proformas" : "invoices"}/${doc.id}`;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <Link href={viewUrl} className="hover:underline">
                          {doc.documentNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {doc.documentType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{clientName || "-"}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDateFr(doc.createdAt)}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {doc.documentHash ? `${doc.documentHash.slice(0, 16)}...` : "Calcul à l'émission"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          10 ans légal
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={viewUrl}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold"
                        >
                          Consulter
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
