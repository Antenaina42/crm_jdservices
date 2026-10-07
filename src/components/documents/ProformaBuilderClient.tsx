"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Car,
  Server,
  Calculator,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProformaBuilderClientProps {
  workspace: any;
  user: any;
  clients: any[];
  catalogItems: any[];
  workspaceSlug: "automobile" | "network";
  preselectedClientId?: string;
  existingDocument?: any;
}

export default function ProformaBuilderClient({
  workspace,
  user,
  clients,
  catalogItems,
  workspaceSlug,
  preselectedClientId,
  existingDocument,
}: ProformaBuilderClientProps) {
  const router = useRouter();
  const isAuto = workspaceSlug === "automobile";

  const [clientId, setClientId] = useState(
    existingDocument?.clientId || preselectedClientId || clients[0]?.id || ""
  );
  const [projectId, setProjectId] = useState(existingDocument?.projectId || "");
  const [date, setDate] = useState(
    existingDocument?.date
      ? new Date(existingDocument.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [validityDays, setValidityDays] = useState(existingDocument?.validityDays || 30);
  const [paymentTerms, setPaymentTerms] = useState(
    existingDocument?.paymentTerms ||
      workspace.defaultPaymentTerms ||
      "Acompte 50% à la commande, solde à la livraison."
  );
  const [notes, setNotes] = useState(
    existingDocument?.notes ||
      (isAuto ? "NB: Carburant aller/retour + péage en SUS" : "Intervention sur site et télémaintenance incluse.")
  );
  const [internalNotes, setInternalNotes] = useState(
    existingDocument?.internalNotes ||
      (isAuto ? "La voiture sera tracté avec notre véhicule par remorque." : "Vérification préalable des accès réseau requise.")
  );
  const [advancePercentage, setAdvancePercentage] = useState(
    existingDocument?.advancePercentage !== undefined ? existingDocument.advancePercentage : isAuto ? 50 : 30
  );

  // Lignes par défaut ou existantes
  const [lines, setLines] = useState<any[]>(
    existingDocument?.lines?.length
      ? existingDocument.lines.map((l: any) => ({
          designation: l.designation,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPriceHt: l.unitPriceHt,
          taxRate: l.taxRate,
        }))
      : isAuto
      ? [
          {
            designation: "Service de check véhicule sur place avec vérification suivi de valise de diagnostic et km et accompagnement pour les plaques WW.",
            quantity: 1,
            unit: "Forfait",
            unitPriceHt: 650,
            taxRate: 20,
          },
          {
            designation: "Rappatriement véhicule - Location remorque pour 2 jours,",
            quantity: 2,
            unit: "Jours",
            unitPriceHt: 125,
            taxRate: 20,
          },
          {
            designation: "Plaque ww français",
            quantity: 1,
            unit: "Unité",
            unitPriceHt: 100,
            taxRate: 20,
          },
        ]
      : [
          {
            designation: "Audit infrastructure & cartographie réseau",
            quantity: 1,
            unit: "Prestation",
            unitPriceHt: 850,
            taxRate: 20,
          },
          {
            designation: "Contrat M2 — PROFESSIONNEL (Maintenance proactive & Firewall)",
            quantity: 1,
            unit: "Mois",
            unitPriceHt: 590,
            taxRate: 20,
          },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client sélectionné
  const selectedClient = clients.find((c) => c.id === clientId);

  // Calculs financiers en temps réel
  const totalHt = lines.reduce((acc, l) => acc + (Number(l.unitPriceHt) || 0) * (Number(l.quantity) || 1), 0);
  const totalTax = lines.reduce(
    (acc, l) => acc + ((Number(l.unitPriceHt) || 0) * (Number(l.quantity) || 1) * (Number(l.taxRate) || 20)) / 100,
    0
  );
  const totalTtc = totalHt + totalTax;

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        designation: "",
        quantity: 1,
        unit: "Forfait",
        unitPriceHt: 0,
        taxRate: 20,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleUpdateLine = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx][field] = val;
    setLines(updated);
  };

  const handleSelectCatalogItem = (item: any) => {
    setLines([
      ...lines,
      {
        designation: item.name,
        description: item.description,
        quantity: 1,
        unit: item.unit || "Forfait",
        unitPriceHt: item.defaultPriceHt,
        taxRate: item.defaultTaxRate || 20,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError("Veuillez sélectionner un client.");
      return;
    }
    if (lines.some((l) => !l.designation.trim())) {
      setError("Toutes les lignes doivent avoir une désignation.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (existingDocument) {
        const res = await fetch(`/api/documents/${existingDocument.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            validityDays,
            paymentTerms,
            notes,
            internalNotes,
            advancePercentage,
            lines,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur modification");

        router.push(`/${workspaceSlug}/proformas/${existingDocument.id}`);
      } else {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: workspace.id,
            clientId,
            projectId: projectId || null,
            documentType: "PROFORMA",
            date,
            validityDays,
            paymentTerms,
            notes,
            internalNotes,
            advancePercentage,
            lines,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur création");

        router.push(`/${workspaceSlug}/proformas/${data.document.id}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <Link
          href={`/${workspaceSlug}/proformas${existingDocument ? `/${existingDocument.id}` : ""}`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          {existingDocument ? "Retour au document" : "Retour aux proformas"}
        </Link>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {existingDocument
            ? `Modifier la Proforma ${existingDocument.documentNumber}`
            : `Créer une Proforma — ${isAuto ? "Import Automobile" : "Accompagnement Réseau"}`}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {existingDocument
            ? "Mise à jour des lignes, quantités, montants et conditions avant émission définitive."
            : "Générez un document commercial préalable conforme aux modèles officiels JD-Services (validité 1 mois)."}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CLIENT & PROJECT SELECTION */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            1. Client &amp; Dossier Rattaché
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sélectionner le Client *</label>
              <select
                required
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId("");
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName ? `${c.companyName} (${c.firstName} ${c.lastName})` : `${c.firstName} ${c.lastName}`} — {c.clientNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Rattacher à un Projet (Optionnel)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              >
                <option value="">Aucun projet spécifique</option>
                {selectedClient?.projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.projectNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-100">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date du document</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Durée de validité (jours)</label>
              <input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">% Acompte requis</label>
              <select
                value={advancePercentage}
                onChange={(e) => setAdvancePercentage(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white"
              >
                <option value="0">0% (Paiement comptant ou à terme)</option>
                <option value="30">30% à la commande</option>
                <option value="50">50% à la commande (Standard Auto)</option>
                <option value="100">100% règlement intégral</option>
              </select>
            </div>
          </div>
        </div>

        {/* CATALOG SELECTOR SHORTCUTS */}
        <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-200/80 space-y-2">
          <div className="text-xs font-bold text-slate-700 flex items-center">
            <Plus className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Ajout rapide depuis le catalogue {isAuto ? "Automobile" : "Réseau"} :
          </div>
          <div className="flex flex-wrap gap-2">
            {catalogItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectCatalogItem(item)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-400 text-[11px] font-semibold text-slate-700 shadow-2xs transition"
              >
                + {item.name} ({formatCurrency(item.defaultPriceHt)})
              </button>
            ))}
          </div>
        </div>

        {/* TABLE OF LINES */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              2. Prestations &amp; Lignes de Facturation
            </h2>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Ajouter une ligne
            </button>
          </div>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center gap-3 text-xs"
              >
                <div className="flex-1 w-full">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Désignation de la prestation
                  </label>
                  <input
                    type="text"
                    required
                    value={line.designation}
                    onChange={(e) => handleUpdateLine(idx, "designation", e.target.value)}
                    placeholder="Description de la prestation..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  />
                </div>

                <div className="w-24">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={line.quantity}
                    onChange={(e) => handleUpdateLine(idx, "quantity", Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-center font-bold"
                  />
                </div>

                <div className="w-24">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Unité
                  </label>
                  <input
                    type="text"
                    value={line.unit}
                    onChange={(e) => handleUpdateLine(idx, "unit", e.target.value)}
                    placeholder="Forfait"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-center"
                  />
                </div>

                <div className="w-28">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Prix Unit. HT (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.unitPriceHt}
                    onChange={(e) => handleUpdateLine(idx, "unitPriceHt", Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-right font-bold"
                  />
                </div>

                <div className="w-24">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    TVA (%)
                  </label>
                  <select
                    value={line.taxRate}
                    onChange={(e) => handleUpdateLine(idx, "taxRate", Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white text-center"
                  >
                    <option value="20">20%</option>
                    <option value="10">10%</option>
                    <option value="5.5">5.5%</option>
                    <option value="0">0%</option>
                  </select>
                </div>

                <div className="w-24 text-right pt-4 md:pt-0">
                  <span className="text-[10px] text-slate-400 block">Total HT</span>
                  <span className="font-black text-slate-900 text-sm">
                    {formatCurrency(Number(line.unitPriceHt || 0) * Number(line.quantity || 1))}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveLine(idx)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition mt-4 md:mt-0"
                  title="Supprimer la ligne"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* TOTALS SUMMARY */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600 font-medium">
                <span>Total HT :</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalHt)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600 font-medium">
                <span>TVA (20%) :</span>
                <span className="font-bold text-slate-900">{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-slate-900 font-black text-base">
                <span>Total TTC :</span>
                <span className="text-blue-600">{formatCurrency(totalTtc)}</span>
              </div>
              {advancePercentage > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 text-[11px] font-semibold">
                  Acompte à la commande ({advancePercentage}%) : {formatCurrency((totalTtc * advancePercentage) / 100)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NOTES & CADRE RÉSERVÉ */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            3. Notes Complémentaires &amp; Mentions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isAuto
                  ? "Notes visibles sur le document (ex: Carburant + péage en SUS)"
                  : "Notes visibles sur le document"}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              ></textarea>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Cadre réservé JD-Services (encadré spécifique au modèle)
              </label>
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              ></textarea>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">
              Modalités de règlement
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON BAR */}
        <div className="flex items-center justify-end space-x-4">
          <Link
            href={`/${workspaceSlug}/proformas`}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-3 rounded-xl text-xs font-black text-white shadow-md transition disabled:opacity-50 ${
              isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
            }`}
          >
            {loading ? "Génération..." : "Enregistrer la Proforma & Visualiser"}
          </button>
        </div>
      </form>
    </div>
  );
}
