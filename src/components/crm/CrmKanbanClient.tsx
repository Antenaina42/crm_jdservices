"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Kanban,
  User,
  Car,
  Server,
  ArrowRight,
  Phone,
  Mail,
  Building,
  Plus,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CrmKanbanClientProps {
  workspace: any;
  user: any;
  clients: any[];
  workspaceSlug: "automobile" | "network";
}

const STAGES = [
  { id: "NOUVEAU", label: "Nouveau", color: "bg-slate-100 text-slate-700" },
  { id: "CONTACTÉ", label: "Contacté", color: "bg-blue-50 text-blue-700" },
  { id: "QUALIFIÉ", label: "Qualifié", color: "bg-indigo-50 text-indigo-700" },
  { id: "PROPOSITION", label: "Proposition", color: "bg-purple-50 text-purple-700" },
  { id: "PROFORMA_ENVOYÉE", label: "Proforma Envoyée", color: "bg-amber-50 text-amber-800" },
  { id: "SIGNATURE_EN_ATTENTE", label: "Signature en attente", color: "bg-orange-50 text-orange-800" },
  { id: "ACCEPTÉ", label: "Accepté", color: "bg-emerald-50 text-emerald-700" },
  { id: "PAYÉ", label: "Payé", color: "bg-teal-50 text-teal-800" },
  { id: "EN_COURS", label: "En cours", color: "bg-cyan-50 text-cyan-800" },
  { id: "TERMINÉ", label: "Terminé", color: "bg-green-100 text-green-900" },
  { id: "PERDU", label: "Perdu", color: "bg-red-50 text-red-700" },
];

export default function CrmKanbanClient({
  workspace,
  user,
  clients,
  workspaceSlug,
}: CrmKanbanClientProps) {
  const isAuto = workspaceSlug === "automobile";

  // Map clients to pipeline stages based on their latest document or project status
  const getStageForClient = (client: any) => {
    const hasPaidInvoice = client.documents?.some((d: any) => d.documentType === "INVOICE" && d.status === "PAID");
    if (hasPaidInvoice) return "PAYÉ";

    const hasSignedProforma = client.documents?.some(
      (d: any) => d.documentType === "PROFORMA" && (d.status === "SIGNED" || d.status === "ACCEPTED")
    );
    if (hasSignedProforma) return "ACCEPTÉ";

    const hasPendingSignature = client.documents?.some(
      (d: any) => d.signatureRequests?.some((s: any) => s.status === "PENDING")
    );
    if (hasPendingSignature) return "SIGNATURE_EN_ATTENTE";

    const hasSentProforma = client.documents?.some(
      (d: any) => d.documentType === "PROFORMA" && d.status === "SENT"
    );
    if (hasSentProforma) return "PROFORMA_ENVOYÉE";

    if (client.projects && client.projects.length > 0) return "EN_COURS";
    if (client.status === "PROSPECT") return "NOUVEAU";
    return "QUALIFIÉ";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pipeline Commercial CRM — {isAuto ? "Import Automobile" : "Réseau B2B"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des opportunités, qualification des prospects et avancement des dossiers
          </p>
        </div>

        <Link
          href={`/${workspaceSlug}/clients?new=true`}
          className={`inline-flex items-center px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition ${
            isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
          }`}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau Prospect
        </Link>
      </div>

      {/* KANBAN BOARD HORIZONTAL SCROLL */}
      <div className="overflow-x-auto pb-6">
        <div className="flex space-x-4 min-w-[2400px]">
          {STAGES.map((stage) => {
            const stageClients = clients.filter((c) => getStageForClient(c) === stage.id);

            return (
              <div
                key={stage.id}
                className="w-72 flex-shrink-0 bg-slate-100/70 rounded-3xl p-4 flex flex-col max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {stage.label}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${stage.color}`}>
                    {stageClients.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageClients.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs italic">
                      Aucun dossier
                    </div>
                  ) : (
                    stageClients.map((client) => {
                      const displayName = client.isCompany && client.companyName
                        ? client.companyName
                        : `${client.firstName} ${client.lastName}`.trim();

                      const totalValue = client.documents?.reduce((acc: number, d: any) => acc + d.totalTtc, 0) || 0;

                      return (
                        <div
                          key={client.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">
                              {client.clientNumber}
                            </span>
                            {totalValue > 0 && (
                              <span className="text-xs font-black text-slate-900">
                                {formatCurrency(totalValue)}
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/${workspaceSlug}/clients/${client.id}`}
                            className="font-bold text-slate-900 group-hover:text-blue-600 transition block text-sm"
                          >
                            {displayName}
                          </Link>

                          {/* Projects preview */}
                          {client.projects && client.projects.length > 0 && (
                            <div className="mt-2 text-[11px] text-slate-600 font-medium">
                              {isAuto ? (
                                <div className="flex items-center text-slate-700">
                                  <Car className="w-3.5 h-3.5 mr-1 text-blue-600 flex-shrink-0" />
                                  <span className="truncate">{client.projects[0].title}</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-slate-700">
                                  <Server className="w-3.5 h-3.5 mr-1 text-cyan-700 flex-shrink-0" />
                                  <span className="truncate">{client.projects[0].title}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="truncate">{client.city}</span>
                            <Link
                              href={`/${workspaceSlug}/clients/${client.id}`}
                              className="text-slate-700 font-bold hover:underline flex items-center"
                            >
                              Ouvrir <ChevronRight className="w-3 h-3 ml-0.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
