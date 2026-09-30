"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Kanban,
  User,
  Car,
  Server,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Building,
  Plus,
  ChevronRight,
  Search,
  Filter,
  FileCheck,
  TrendingUp,
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
  const [search, setSearch] = useState("");
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});

  // Déterminer l'étape automatique ou manuelle
  const getStageForClient = (client: any) => {
    if (stageOverrides[client.id]) {
      return stageOverrides[client.id];
    }

    const hasPaidInvoice = client.documents?.some(
      (d: any) => (d.documentType === "INVOICE" || d.documentType === "ADVANCE_PAYMENT") && d.status === "PAID"
    );
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

  const moveStage = (clientId: string, direction: "prev" | "next") => {
    const currentStageId = getStageForClient(clients.find((c) => c.id === clientId));
    const currentIndex = STAGES.findIndex((s) => s.id === currentStageId);
    if (currentIndex === -1) return;

    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < STAGES.length) {
      setStageOverrides((prev) => ({
        ...prev,
        [clientId]: STAGES[nextIndex].id,
      }));
    }
  };

  const filteredClients = clients.filter((c) => {
    const displayName = c.isCompany && c.companyName ? c.companyName : `${c.firstName} ${c.lastName}`.trim();
    const matches =
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.clientNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()));
    return matches;
  });

  const totalPipelineValue = clients.reduce((acc, c) => {
    const docSum = c.documents?.reduce((s: number, d: any) => s + (d.totalTtc || 0), 0) || 0;
    return acc + docSum;
  }, 0);

  return (
    <div className="space-y-6 w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Pipeline Commercial CRM — {isAuto ? "Import Automobile" : "Réseau B2B"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des opportunités, qualification des prospects et conversion en proformas
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href={`/${workspaceSlug}/clients?new=true`}
            className={`inline-flex items-center px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition ${
              isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
            }`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nouveau Dossier Prospect
          </Link>
        </div>
      </div>

      {/* SEARCH AND METRICS BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, ville, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-6 text-xs w-full md:w-auto justify-between md:justify-end">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Dossiers Suivis</span>
            <span className="text-slate-900 font-black text-sm">{filteredClients.length} dossiers</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] block">Valeur Globale Pipeline</span>
            <span className="text-blue-600 font-black text-sm">{formatCurrency(totalPipelineValue)}</span>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD HORIZONTAL SCROLL */}
      <div className="overflow-x-auto pb-6">
        <div className="flex space-x-4 min-w-[2600px]">
          {STAGES.map((stage, stageIdx) => {
            const stageClients = filteredClients.filter((c) => getStageForClient(c) === stage.id);
            const stageValue = stageClients.reduce(
              (acc, c) => acc + (c.documents?.reduce((s: number, d: any) => s + (d.totalTtc || 0), 0) || 0),
              0
            );

            return (
              <div
                key={stage.id}
                className="w-72 flex-shrink-0 bg-slate-100/70 rounded-3xl p-4 flex flex-col max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="pb-3 border-b border-slate-200/80 mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {stage.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${stage.color}`}>
                      {stageClients.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <div className="text-[10px] font-mono font-bold text-slate-500">
                      {formatCurrency(stageValue)}
                    </div>
                  )}
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {stageClients.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Aucun dossier
                    </div>
                  ) : (
                    stageClients.map((client) => {
                      const displayName = client.isCompany && client.companyName
                        ? client.companyName
                        : `${client.firstName} ${client.lastName}`.trim();

                      const totalValue =
                        client.documents?.reduce((acc: number, d: any) => acc + (d.totalTtc || 0), 0) || 0;

                      return (
                        <div
                          key={client.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition group space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
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
                            className="font-bold text-slate-900 group-hover:text-blue-600 transition block text-sm leading-tight"
                          >
                            {displayName}
                          </Link>

                          {/* Projects preview */}
                          {client.projects && client.projects.length > 0 && (
                            <div className="text-[11px] text-slate-600 font-medium">
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

                          {/* Action quick buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <Link
                              href={`/${workspaceSlug}/proformas/new?clientId=${client.id}`}
                              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-bold"
                              title="Créer une proforma pour ce client"
                            >
                              <Plus className="w-3 h-3 mr-0.5" />
                              Proforma
                            </Link>

                            <div className="flex items-center space-x-1">
                              {stageIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveStage(client.id, "prev")}
                                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                  title="Reculer d'une étape"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {stageIdx < STAGES.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveStage(client.id, "next")}
                                  className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                  title="Avancer à l'étape suivante"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
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
