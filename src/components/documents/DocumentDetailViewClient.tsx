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
} from "lucide-react";
import DocumentViewer from "./DocumentViewer";
import { formatCurrency } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
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
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

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
      />
    </div>
  );
}
