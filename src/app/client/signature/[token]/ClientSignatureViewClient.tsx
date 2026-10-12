"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Lock,
  Printer,
  Calendar,
  Building,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import AutomobileProformaTemplate from "@/components/documents/AutomobileProformaTemplate";
import NetworkProformaTemplate from "@/components/documents/NetworkProformaTemplate";
import { formatCurrency, formatDateFr } from "@/lib/utils";

export default function ClientSignatureViewClient() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Modals state
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);

  // Form states
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [modificationComment, setModificationComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/signature/${token}`);
        const resData = await res.json();

        if (!res.ok) {
          throw new Error(resData.error || "Impossible de charger le document");
        }

        setData(resData);
        setSignerName(resData.signatureRequest?.signerName || "");
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) loadDocument();
  }, [token]);

  const handleSign = async () => {
    if (!agreed) {
      alert("Veuillez cocher la case confirmant votre accord avec le document.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/signature/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACCEPT_AND_SIGN",
          signerName,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erreur lors de la signature");

      setSuccessMessage("Document signé avec succès ! Une preuve d'évidence certifiée a été générée.");
      setShowSignModal(false);
      const reload = await fetch(`/api/public/signature/${token}`);
      const updated = await reload.json();
      setData(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert("Veuillez indiquer un motif de refus.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/signature/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erreur lors du refus");

      setSuccessMessage("Le document a été refusé. L'équipe JD-Services a été notifiée.");
      setShowRejectModal(false);
      const reload = await fetch(`/api/public/signature/${token}`);
      const updated = await reload.json();
      setData(updated);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestModification = async () => {
    if (!modificationComment.trim()) {
      alert("Veuillez renseigner votre commentaire.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/signature/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REQUEST_MODIFICATION",
          comment: modificationComment,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erreur");

      setSuccessMessage("Votre demande de modification a été transmise.");
      setShowCommentModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-sm font-bold text-slate-700">Chargement sécurisé du document...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Lien introuvable ou expiré</h2>
          <p className="text-sm text-slate-600 mb-6">{error || "Ce document n'est plus disponible."}</p>
          <p className="text-xs text-slate-400">Pour toute question, veuillez contacter JD-SERVICES au 06.25.98.67.23.</p>
        </div>
      </div>
    );
  }

  const { document: doc, signatureRequest: sigReq } = data;
  const isSigned = sigReq.status === "SIGNED";
  const isRejected = sigReq.status === "REJECTED";
  const isAuto = doc.workspace?.slug === "automobile";

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-xs">
              JD
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-sm tracking-tight block">JD-SERVICES</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Portail Signature Sécurisé</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              <span>Chiffrement SSL 256-bit • eIDAS Compliant</span>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
              title="Imprimer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {successMessage && (
        <div className="no-print bg-emerald-600 text-white text-center py-3 px-4 text-xs font-semibold shadow-sm">
          {successMessage}
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="no-print bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">Document à signer :</div>
            <div className="text-lg font-black text-slate-900">
              {doc.documentNumber} • {formatCurrency(doc.totalTtc)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Destinataire : <strong className="text-slate-800">{sigReq.signerName}</strong>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            {!isSigned && !isRejected && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCommentModal(true)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                  Demander modification
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                >
                  <XCircle className="w-3.5 h-3.5 inline mr-1" />
                  Refuser
                </button>

                <button
                  type="button"
                  onClick={() => setShowSignModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                  ACCEPTER ET SIGNER
                </button>
              </>
            )}

            {isSigned && (
              <div className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                Document signé &amp; certifié le {formatDateFr(sigReq.signedAt)}
              </div>
            )}

            {isRejected && (
              <div className="inline-flex items-center px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                <XCircle className="w-4 h-4 mr-1.5 text-red-600" />
                Document refusé
              </div>
            )}
          </div>
        </div>

        {isSigned && sigReq.evidence && (
          <div className="no-print bg-slate-900 text-white p-5 rounded-2xl shadow-sm text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-emerald-400 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Dossier de Preuve de Signature Électronique (Horodatage Qualifié eIDAS)
              </span>
              <span className="font-mono text-[11px] text-slate-400">ID : {sigReq.evidence.signatureId}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-400 block">Signataire vérifié :</span>
                <strong className="text-white">{sigReq.evidence.signerName}</strong> ({sigReq.signerEmail})
              </div>
              <div>
                <span className="text-slate-400 block">Horodatage certifié :</span>
                <strong className="text-white">{new Date(sigReq.evidence.signedAt).toLocaleString("fr-FR")}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Adresse IP signataire :</span>
                <span className="font-mono text-white">{sigReq.evidence.ipAddress}</span>
              </div>
            </div>
            <div className="pt-2 text-[10px] font-mono text-slate-400 truncate">
              Empreinte d&apos;intégrité SHA-256 : {sigReq.evidence.documentHash}
            </div>
          </div>
        )}

        <div className="overflow-x-auto flex justify-center py-4">
          {isAuto ? (
            <AutomobileProformaTemplate
              document={doc}
              seller={doc.workspace}
              client={doc.client}
              lines={doc.lines}
              signatureClient={
                isSigned
                  ? {
                      signedAt: sigReq.signedAt,
                      signerName: sigReq.signerName,
                      ipAddress: sigReq.evidence?.ipAddress,
                    }
                  : null
              }
              signatureSeller={{
                signedAt: doc.date,
                signerName: "Jean-Désiré Martialino",
                certified: true,
              }}
            />
          ) : (
            <NetworkProformaTemplate
              document={doc}
              seller={doc.workspace}
              client={doc.client}
              lines={doc.lines}
              signatureClient={
                isSigned
                  ? {
                      signedAt: sigReq.signedAt,
                      signerName: sigReq.signerName,
                      ipAddress: sigReq.evidence?.ipAddress,
                    }
                  : null
              }
              signatureSeller={{
                signedAt: doc.date,
                signerName: "Jean-Désiré Martialino",
              }}
            />
          )}
        </div>
      </main>

      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Confirmer la Signature Électronique
            </h3>
            <p className="text-xs text-slate-600 mb-6">
              Vous vous apprêtez à apposer votre signature sur le document <strong>{doc.documentNumber}</strong> d&apos;un montant de <strong>{formatCurrency(doc.totalTtc)}</strong>.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nom et prénom du signataire :
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-slate-700 leading-relaxed select-none">
                    Je reconnais avoir pris connaissance de l&apos;intégralité des prestations mentionnées, des conditions financières et des modalités de règlement, et j&apos;appose ma signature avec mention « Bon pour accord ».
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={submitting || !agreed || !signerName.trim()}
                onClick={handleSign}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? "Signature en cours..." : "Valider et Signer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Refuser le document
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Veuillez préciser le motif de refus afin d&apos;en informer l&apos;équipe commerciale.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex : Erreur de prestation, tarif non conforme aux échanges..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs"
            ></textarea>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={submitting || !rejectionReason.trim()}
                onClick={handleReject}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
              >
                {submitting ? "Envoi..." : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Demander une modification
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Précisez les ajustements souhaités sur ce document.
            </p>
            <textarea
              rows={4}
              value={modificationComment}
              onChange={(e) => setModificationComment(e.target.value)}
              placeholder="Ex : Ajouter une prestation supplémentaire, modifier l'adresse de facturation..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs"
            ></textarea>
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCommentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={submitting || !modificationComment.trim()}
                onClick={handleRequestModification}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? "Envoi..." : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
