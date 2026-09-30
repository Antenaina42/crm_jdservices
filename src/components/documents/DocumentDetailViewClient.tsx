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
  const isAdvancePayment = doc.documentType === "ADVANCE_PAYMENT";
  const isPayable = isInvoice || isAdvancePayment;

  // Conversion Modal State (Full, Advance, Balance)
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [conversionType, setConversionType] = useState<"FULL" | "ADVANCE" | "BALANCE">("FULL");
  const [advanceAmount, setAdvanceAmount] = useState<number>(
    isAuto ? 500 : Math.round(doc.totalTtc * 0.3 * 100) / 100
  );
  const [advanceDescription, setAdvanceDescription] = useState(
    isAuto ? "Règlement 1 - acompte de réservation" : "Acompte contractuel (30%)"
  );
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(doc.client?.email || "");
  const [emailSubject, setEmailSubject] = useState(
    doc.documentType === "PROFORMA"
      ? `Facture Proforma n° ${doc.documentNumber} — ${workspace.name}`
      : `Facture n° ${doc.documentNumber} — ${workspace.name}`
  );
  const [emailMessage, setEmailMessage] = useState(
    `Bonjour,\n\nVeuillez trouver ci-joint votre ${
      doc.documentType === "PROFORMA" ? "facture proforma" : "facture"
    } n° ${doc.documentNumber} d'un montant total de ${formatCurrency(doc.totalTtc)}.\n\nRestant à votre entière disposition pour tout renseignement complémentaire.\n\nCordialement,\n${workspace.name}`
  );
  const [emailSubmitting, setEmailSubmitting] = useState(false);

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

  const handleSendEmailClick = () => {
    setEmailRecipient(doc.client?.email || "");
    setShowEmailModal(true);
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: emailRecipient,
          subject: emailSubject,
          message: emailMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi");
      setFeedback({ type: "success", message: data.message });
      setShowEmailModal(false);
      router.refresh();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setEmailSubmitting(false);
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

  const handleConvertClick = () => {
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/convert-to-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversionType,
          advanceAmountTtc: advanceAmount,
          advanceDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur conversion");
      setShowConvertModal(false);
      router.push(`/${workspaceSlug}/invoices/${data.invoice.id}`);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
      setConvertSubmitting(false);
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
          {isPayable && doc.status !== "PAID" && (
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
              onClick={handleConvertClick}
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
      {isPayable && (
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
        onSendEmail={handleSendEmailClick}
        onRequestSignature={handleRequestSignature}
        onCreateInvoice={isProforma ? handleConvertClick : undefined}
        onRecordPayment={isPayable && doc.status !== "PAID" ? () => setShowPaymentModal(true) : undefined}
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

      {/* MODAL CONVERTIR EN FACTURE LÉGALE */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">Générer la Facture Comptable</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Dossier Proforma :</span>
                <strong className="text-slate-900">{doc.documentNumber}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Devis TTC :</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(doc.totalTtc)}</span>
              </div>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-2">Type de facture à émettre :</label>
                <div className="grid grid-cols-1 gap-2.5">
                  <label className={`p-3 rounded-2xl border cursor-pointer transition flex items-start space-x-3 ${
                    conversionType === "FULL" ? "border-blue-600 bg-blue-50/40 shadow-xs" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="conversionType"
                      value="FULL"
                      checked={conversionType === "FULL"}
                      onChange={() => setConversionType("FULL")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-black text-slate-900 text-sm">Facture Complète (100%)</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Facturation intégrale de la prestation ({formatCurrency(doc.totalTtc)} TTC).
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-2xl border cursor-pointer transition flex items-start space-x-3 ${
                    conversionType === "ADVANCE" ? "border-blue-600 bg-blue-50/40 shadow-xs" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="conversionType"
                      value="ADVANCE"
                      checked={conversionType === "ADVANCE"}
                      onChange={() => setConversionType("ADVANCE")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-black text-slate-900 text-sm">Facture d&apos;Acompte</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Facture d&apos;acompte officielle conforme art. 289-I-1-c du CGI (ex: acompte de réservation).
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 rounded-2xl border cursor-pointer transition flex items-start space-x-3 ${
                    conversionType === "BALANCE" ? "border-blue-600 bg-blue-50/40 shadow-xs" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="conversionType"
                      value="BALANCE"
                      checked={conversionType === "BALANCE"}
                      onChange={() => setConversionType("BALANCE")}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-black text-slate-900 text-sm">Facture de Solde</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Facture finale déduisant automatiquement tous les acomptes précédemment facturés.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {conversionType === "ADVANCE" && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">Montant de l&apos;Acompte TTC (€)</label>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => setAdvanceAmount(500)}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold"
                        >
                          500 €
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvanceAmount(Math.round(doc.totalTtc * 0.3 * 100) / 100)}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold"
                        >
                          30%
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdvanceAmount(Math.round(doc.totalTtc * 0.5 * 100) / 100)}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold"
                        >
                          50%
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-slate-200 font-mono font-bold text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Libellé de l&apos;acompte</label>
                    <input
                      type="text"
                      value={advanceDescription}
                      onChange={(e) => setAdvanceDescription(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                      placeholder="ex: Règlement 1 - acompte de réservation"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={convertSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {convertSubmitting ? "Génération..." : "Confirmer et Créer la Facture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ENVOI EMAIL PREVIEW */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-slate-900 text-base">Transmission par E-mail</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Destinataire (Email Client)</label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Objet de l&apos;e-mail</label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message d&apos;accompagnement</label>
                <textarea
                  rows={5}
                  required
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-sans leading-relaxed"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-[11px] text-slate-600">
                <span className="flex items-center">
                  <FileCheck className="w-4 h-4 text-emerald-600 mr-1.5" />
                  Pièce jointe : <strong>{doc.documentNumber}.pdf</strong>
                </span>
                <span className="font-bold text-slate-800">Lien sécurisé inclus</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={emailSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm disabled:opacity-50"
                >
                  {emailSubmitting ? "Transmission en cours..." : "Envoyer l'E-mail Officiel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
