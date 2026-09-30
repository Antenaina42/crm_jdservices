"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Calendar,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatDateFr } from "@/lib/utils";

interface PaymentsTrackerClientProps {
  workspace: any;
  user: any;
  payments: any[];
  unpaidInvoices: any[];
  workspaceSlug: "automobile" | "network";
}

export default function PaymentsTrackerClient({
  workspace,
  user,
  payments: initialPayments,
  unpaidInvoices,
  workspaceSlug,
}: PaymentsTrackerClientProps) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Payment state
  const [selectedDocId, setSelectedDocId] = useState(unpaidInvoices[0]?.id || "");
  const [amount, setAmount] = useState<number>(unpaidInvoices[0]?.balanceDue || 0);
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAuto = workspaceSlug === "automobile";

  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    const doc = unpaidInvoices.find((d) => d.id === docId);
    if (doc) setAmount(doc.balanceDue);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId || !amount || amount <= 0) {
      alert("Veuillez sélectionner une facture et renseigner un montant.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          documentId: selectedDocId,
          amount,
          paymentMethod,
          paymentDate,
          reference,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur enregistrement");

      setShowAddModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Suivi des Règlements &amp; Échéances — {isAuto ? "Automobile" : "Réseau"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enregistrement des paiements, gestion des retards et relances de facturation
          </p>
        </div>

        {unpaidInvoices.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={`inline-flex items-center px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition ${
              isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
            }`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Enregistrer un Règlement
          </button>
        )}
      </div>

      {/* FACTURES EN ATTENTE D'ENCAISSEMENT OU EN RETARD */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center">
          <Clock className="w-4 h-4 mr-1.5 text-amber-500" />
          Factures à Encaisser &amp; Alertes d&apos;Échéances ({unpaidInvoices.length})
        </h2>

        {unpaidInvoices.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            Toutes les factures émises sont actuellement soldées.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {unpaidInvoices.map((inv) => {
              const isOverdue = inv.dueDate && new Date(inv.dueDate) < now;
              const clientName = inv.client.companyName || `${inv.client.firstName} ${inv.client.lastName}`.trim();

              return (
                <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/${workspaceSlug}/invoices/${inv.id}`}
                        className="font-black text-slate-900 hover:underline text-sm"
                      >
                        {inv.documentNumber}
                      </Link>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-700">{clientName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                      <span>Émise le {formatDateFr(inv.date)}</span>
                      <span>•</span>
                      <span className={isOverdue ? "text-red-600 font-bold" : "text-slate-600"}>
                        Échéance : {formatDateFr(inv.dueDate)}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.2 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                          EN RETARD
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Reste à payer</div>
                      <div className="text-sm font-black text-slate-900">
                        {formatCurrency(inv.balanceDue)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleDocChange(inv.id);
                        setShowAddModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
                    >
                      Encaisser
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTORIQUE DES RÈGLEMENTS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Journal des Paiements Reçus ({payments.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Facture / Document</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Mode de règlement</th>
                <th className="py-3 px-4">Référence</th>
                <th className="py-3 px-4 text-right">Montant Encaissé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucun paiement enregistré pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const clientName = p.client.companyName || `${p.client.firstName} ${p.client.lastName}`.trim();

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {formatDateFr(p.paymentDate)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.document?.documentNumber || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{clientName}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">{p.paymentMethod}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{p.reference || "-"}</td>
                      <td className="py-3.5 px-4 text-right font-black text-teal-700 text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Enregistrer un Règlement Client
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mise à jour du solde de la facture et traçabilité comptable
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Facture concernée *</label>
                <select
                  required
                  value={selectedDocId}
                  onChange={(e) => handleDocChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium"
                >
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.documentNumber} — Reste {formatCurrency(inv.balanceDue)} ({inv.client.companyName || `${inv.client.firstName} ${inv.client.lastName}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Montant Encaissé (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date d&apos;encaissement *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mode de règlement *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  >
                    <option value="TRANSFER">Virement Bancaire</option>
                    <option value="CARD">Carte Bancaire</option>
                    <option value="CHECK">Chèque</option>
                    <option value="CASH">Espèces</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Référence / Bordereau</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex : VIR-2026-998"
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes internes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optionnel..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-sm transition ${
                    isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
                  }`}
                >
                  {submitting ? "Validation..." : "Valider l'Encaissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
