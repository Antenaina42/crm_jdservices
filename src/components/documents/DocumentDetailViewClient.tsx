"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  FileCheck,
  Mail,
  PenTool,
  Printer,
  Copy,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Lock,
  CreditCard,
  Edit2,
  Trash2,
  X,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import DocumentViewer from "./DocumentViewer";
import { formatCurrency, formatDateFr } from "@/lib/utils";

interface DocumentDetailViewClientProps {
  workspace: any;
  user: any;
  document: any;
  workspaceSlug: "automobile" | "network";
}

export default function DocumentDetailViewClient({
  workspace,
  user,
  document: initialDoc,
  workspaceSlug,
}: DocumentDetailViewClientProps) {
  const router = useRouter();
  const [doc, setDoc] = useState(initialDoc);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string; details?: any } | null>(null);
  const [signatureLinkModal, setSignatureLinkModal] = useState<string | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(doc.balanceDue || doc.totalTtc || 0);
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const isAuto = workspaceSlug === "automobile";
  const isProforma = doc.documentType === "PROFORMA";
  const isInvoice = doc.documentType === "INVOICE";
  const isCreditNote = doc.documentType === "CREDIT_NOTE";

  // Signature active
  const activeSig = doc.signatureRequests?.find((s: any) => s.status === "SIGNED") || doc.signatureRequests?.[0];

  const handleIssue = async () => {
    if (!confirm("Voulez-vous émettre officiellement ce document ? Une fois émis, il sera verrouillé et ne pourra plus être modifié directement.")) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/issue`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Échec de l'émission",
          details: data.checklist,
        });
        return;
      }
      setDoc(data.document);
      setFeedback({
        type: "success",
        message: `Document ${data.document.documentNumber} émis officiellement avec succès (Empreinte SHA-256 scellée).`,
      });
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/send-email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi");
      setFeedback({ type: "success", message: data.message });
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestSignature = async () => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/request-signature`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur signature");
      setSignatureLinkModal(data.signatureUrl);
      setFeedback({
        type: "success",
        message: "Lien de signature électronique généré avec succès.",
      });
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!confirm("Voulez-vous générer la Facture Comptable Définitive à partir de cette proforma ?")) {
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/convert-to-invoice`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur conversion");
      router.push(`/${workspaceSlug}/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
      setActionLoading(false);
    }
  };

  const handleCreateCreditNote = async () => {
    const reason = prompt("Veuillez indiquer le motif de l'Avoir (ex: Annulation commande, remise commerciale) :");
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/credit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création avoir");
      alert(data.message);
      router.push(`/${workspaceSlug}/invoices/${data.creditNote.id}`);
    } catch (err: any) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!confirm(`Confirmez-vous la suppression du document ${doc.documentNumber} ?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur suppression");
      alert("Document supprimé.");
      router.push(`/${workspaceSlug}/${isProforma ? "proformas" : "invoices"}`);
    } catch (err: any) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      alert("Veuillez indiquer un montant supérieur à 0.");
      return;
    }
    setPaymentSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          documentId: doc.id,
          amount: paymentAmount,
          paymentMethod,
          paymentDate,
          reference: paymentReference,
          notes: paymentNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur enregistrement règlement");

      setDoc(data.updatedDoc);
      setShowPaymentModal(false);
      setFeedback({
        type: "success",
        message: `Règlement de ${formatCurrency(paymentAmount)} enregistré avec succès ! Facture mise à jour.`,
      });
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Back button & Action summary */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/${workspaceSlug}/${isProforma ? "proformas" : "invoices"}`}
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Retour à la liste des {isProforma ? "proformas" : "factures"}
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {doc.documentNumber}
            </h1>
            {doc.isImmutable && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white shadow-2xs">
                <Lock className="w-3 h-3 mr-1 text-emerald-400" />
                Scellé / Immuable
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
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
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BOUTON PAYER POUR FACTURES */}
          {isInvoice && doc.status !== "PAID" && (
            <button
              type="button"
              onClick={() => {
                setPaymentAmount(doc.balanceDue || doc.totalTtc);
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition"
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              Payer la Facture
            </button>
          )}

          {/* BOUTON CRÉER LA FACTURE DEPUIS PROFORMA */}
          {isProforma && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConvertToInvoice}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4 mr-1.5" />
              Convertir en Facture Légale
            </button>
          )}

          {/* MODIFIER BROUILLON */}
          {!doc.isImmutable && (
            <Link
              href={`/${workspaceSlug}/${isProforma ? "proformas" : "invoices"}/${doc.id}/edit`}
              className="inline-flex items-center px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Modifier
            </Link>
          )}

          {/* ÉMETTRE & SCELLER */}
          {!doc.isImmutable && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleIssue}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Émettre &amp; Verrouiller
            </button>
          )}

          {/* AVOIR SI FACTURE ERRONÉE */}
          {isInvoice && doc.status !== "CANCELLED" && doc.status !== "CREDITED" && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleCreateCreditNote}
              className="inline-flex items-center px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition"
            >
              Créer un Avoir
            </button>
          )}

          {/* SUPPRIMER SI BROUILLON */}
          {!doc.isImmutable && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleDeleteDocument}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              title="Supprimer ce document brouillon"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* RESTE À PAYER BANNER FOR INVOICES */}
      {isInvoice && (
        <div className="no-print bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${
              doc.status === "PAID" ? "bg-teal-600" : "bg-amber-600"
            }`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                État des Règlements
              </div>
              <div className="text-lg font-black text-slate-900">
                {doc.status === "PAID" ? (
                  <span className="text-teal-700">Facture 100% Réglée ({formatCurrency(doc.totalTtc)})</span>
                ) : (
                  <span>
                    Reste à régler : <strong className="text-amber-700">{formatCurrency(doc.balanceDue)}</strong> sur {formatCurrency(doc.totalTtc)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {doc.status !== "PAID" && (
            <button
              type="button"
              onClick={() => {
                setPaymentAmount(doc.balanceDue);
                setShowPaymentModal(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
            >
              <DollarSign className="w-4 h-4 mr-1.5" />
              Enregistrer un Règlement
            </button>
          )}
        </div>
      )}

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`no-print p-4 rounded-2xl border text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-start space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p>{feedback.message}</p>
              {feedback.details && Array.isArray(feedback.details) && (
                <div className="mt-2 space-y-1 pl-4 border-l-2 border-red-300">
                  {feedback.details.map((item: any, i: number) => (
                    <div key={i} className="text-[11px]">
                      {item.passed ? "✓" : "✗"} {item.item} {item.details ? `(${item.details})` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIGNATURE LINK MODAL / NOTICE */}
      {signatureLinkModal && (
        <div className="no-print p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
          <div className="font-bold text-emerald-900 flex items-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5" />
            Lien sécurisé de signature électronique généré pour le client :
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={signatureLinkModal}
              className="flex-1 p-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono select-all text-slate-800"
            />
            <Link
              href={signatureLinkModal}
              target="_blank"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center"
            >
              Tester portail <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>
      )}

      {/* MAIN DOCUMENT VIEWER */}
      <DocumentViewer
        workspaceSlug={workspaceSlug}
        document={doc}
        seller={doc.workspace}
        client={doc.client}
        lines={doc.lines}
        signatureClient={
          activeSig?.status === "SIGNED"
            ? {
                signedAt: activeSig.signedAt,
                signerName: activeSig.signerName,
                ipAddress: activeSig.ipAddress,
              }
            : null
        }
        signatureSeller={{
          signedAt: doc.date,
          signerName: "Jean-Désiré Martialino",
          certified: true,
        }}
        onSendEmail={handleSendEmail}
        onRequestSignature={handleRequestSignature}
        onCreateInvoice={isProforma ? handleConvertToInvoice : undefined}
        onRecordPayment={isInvoice && doc.status !== "PAID" ? () => setShowPaymentModal(true) : undefined}
      />

      {/* MODAL ENREGISTRER PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-base">Enregistrer un Règlement</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Facture :</span>
                <strong className="text-slate-900">{doc.documentNumber}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Facture TTC :</span>
                <span className="font-mono">{formatCurrency(doc.totalTtc)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Reste à payer :</span>
                <strong className="text-amber-700 font-mono">{formatCurrency(doc.balanceDue)}</strong>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Montant réglé (€)</label>
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
                <label className="block font-bold text-slate-700 mb-1">Mode de règlement</label>
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
                  <label className="block font-bold text-slate-700 mb-1">Date du paiement</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Référence transaction</label>
                  <input
                    type="text"
                    placeholder="ex: VIR-98214"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Commentaire</label>
                <textarea
                  rows={2}
                  placeholder="Remarques comptables..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {paymentSubmitting ? "Validation..." : "Valider le Règlement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
