"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  CreditCard,
  Edit2,
  Trash2,
  X,
  DollarSign,
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
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Quick Payment Modal
  const [payingDoc, setPayingDoc] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentReference, setPaymentReference] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const isAuto = workspaceSlug === "automobile";
  const isProforma = documentType === "PROFORMA";
  const isInvoice = documentType === "INVOICE";
  const basePath = `/${workspaceSlug}/${isProforma ? "proformas" : "invoices"}`;

  const title = isProforma
    ? isAuto
      ? "Factures Proformas Automobiles"
      : "Factures Proformas Réseau & IT"
    : isAuto
    ? "Factures Comptables Automobiles"
    : "Factures Comptables Réseau";

  const filteredDocs = documents.filter((d) => {
    const clientName = d.client?.isCompany && d.client?.companyName
      ? d.client.companyName
      : `${d.client?.firstName || ""} ${d.client?.lastName || ""}`.trim();

    const matchesSearch =
      d.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter !== "ALL" && d.status !== statusFilter) return false;
    return true;
  });

  const handleOpenPayModal = (doc: any) => {
    setPayingDoc(doc);
    setPaymentAmount(doc.balanceDue || doc.totalTtc);
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDoc || paymentAmount <= 0) return;
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          documentId: payingDoc.id,
          amount: paymentAmount,
          paymentMethod,
          paymentDate,
          reference: paymentReference,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur enregistrement règlement");

      setDocuments(
        documents.map((d) => (d.id === payingDoc.id ? { ...d, ...data.updatedDoc } : d))
      );
      setPayingDoc(null);
      alert(`Paiement de ${formatCurrency(paymentAmount)} enregistré ! Facture mise à jour.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeleteDraft = async (id: string, num: string) => {
    if (!confirm(`Supprimer définitivement la proforma brouillon ${num} ?`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setDocuments(documents.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 w-full">
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
              ? "Documents commerciaux préalables à la facture comptable (validité légale 1 mois)"
              : "Factures émises légalement, immuables et scellées avec suivi des paiements"}
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
                <th className="py-3 px-4 text-right">Actions (CRUD)</th>
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
                  const clientName = doc.client?.isCompany && doc.client?.companyName
                    ? doc.client.companyName
                    : `${doc.client?.firstName || ""} ${doc.client?.lastName || ""}`.trim();

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
                        {doc.client ? (
                          <Link
                            href={`/${workspaceSlug}/clients/${doc.client.id}`}
                            className="font-bold text-slate-800 hover:underline"
                          >
                            {clientName}
                          </Link>
                        ) : (
                          <span className="font-bold text-slate-800">{clientName}</span>
                        )}
                        <div className="text-[10px] text-slate-400">{doc.client?.email}</div>
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

                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* BOUTON PAYER SUR FACTURES NON SOLDÉES */}
                        {isInvoice && doc.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(doc)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-2xs"
                            title="Payer cette facture"
                          >
                            <CreditCard className="w-3.5 h-3.5 mr-1" />
                            Payer
                          </button>
                        )}

                        {/* MODIFIER PROFORMA BROUILLON */}
                        {isProforma && !doc.isImmutable && (
                          <Link
                            href={`${basePath}/${doc.id}/edit`}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                            title="Modifier la proforma"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Modifier
                          </Link>
                        )}

                        {/* VOIR LE DOCUMENT */}
                        <Link
                          href={`${basePath}/${doc.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-2xs"
                        >
                          Consulter <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>

                        {/* SUPPRIMER BROUILLON */}
                        {isProforma && !doc.isImmutable && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(doc.id, doc.documentNumber)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                            title="Supprimer la proforma"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK PAYMENT MODAL FROM LIST */}
      {payingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-base">Paiement Facture</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayingDoc(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Facture N° :</span>
                <strong className="text-slate-900 font-bold">{payingDoc.documentNumber}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Reste à payer :</span>
                <strong className="text-amber-700 font-mono font-bold">
                  {formatCurrency(payingDoc.balanceDue || payingDoc.totalTtc)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleExecutePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Montant à régler (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mode de paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="TRANSFER">Virement Bancaire (SEPA)</option>
                  <option value="CARD">Carte Bancaire (CB / Stripe)</option>
                  <option value="CHECK">Chèque Bancaire</option>
                  <option value="CASH">Espèces</option>
                  <option value="OTHER">Autre mode</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Réf. transaction</label>
                  <input
                    type="text"
                    placeholder="ex: VIR-7782"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayingDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {submittingPayment ? "Validation..." : "Enregistrer le Paiement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
