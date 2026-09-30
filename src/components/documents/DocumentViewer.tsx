"use client";

import React, { useState, useRef } from "react";
import {
  Printer,
  Download,
  Mail,
  PenTool,
  FileCheck,
  CreditCard,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle,
  Copy,
  Clock,
  ArrowRight,
} from "lucide-react";
import AutomobileProformaTemplate from "./AutomobileProformaTemplate";
import NetworkProformaTemplate from "./NetworkProformaTemplate";

interface DocumentViewerProps {
  workspaceSlug: "automobile" | "network";
  document: any;
  seller: any;
  client: any;
  lines: any[];
  signatureClient?: any;
  signatureSeller?: any;
  onSendEmail?: () => void;
  onRequestSignature?: () => void;
  onCreateInvoice?: () => void;
  onRecordPayment?: () => void;
  onDuplicate?: () => void;
}

export default function DocumentViewer({
  workspaceSlug,
  document,
  seller,
  client,
  lines,
  signatureClient,
  signatureSeller,
  onSendEmail,
  onRequestSignature,
  onCreateInvoice,
  onRecordPayment,
  onDuplicate,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 70));
  const handleResetZoom = () => setZoom(100);

  const toggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!isFullscreen) {
      if (viewerContainerRef.current.requestFullscreen) {
        viewerContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (window.document.exitFullscreen) {
        window.document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Brouillon</span>;
      case "SENT":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Envoyée au client</span>;
      case "SIGNED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Signée électroniquement</span>;
      case "ACCEPTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Acceptée</span>;
      case "PAID":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">Payée intégralement</span>;
      case "OVERDUE":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">En retard de paiement</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">Annulée</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div ref={viewerContainerRef} className="space-y-4">
      {/* TOOLBAR DESKTOP & MOBILE */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-16 z-10">
        <div className="flex items-center space-x-3">
          <div className="text-sm font-extrabold text-slate-900">
            {document.documentNumber}
          </div>
          {getStatusBadge(document.status)}
        </div>

        {/* View controls */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition"
              title="Zoom arrière (-10%)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-600 select-none">
              {zoom}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition"
              title="Zoom avant (+10%)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition"
              title="Réinitialiser zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            title={isFullscreen ? "Quitter plein écran" : "Plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs"
            title="Imprimer au format A4"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            <span>Imprimer</span>
          </button>

          {onSendEmail && (
            <button
              type="button"
              onClick={onSendEmail}
              className="inline-flex items-center px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200"
              title="Envoyer par email au client"
            >
              <Mail className="w-4 h-4 mr-1.5" />
              <span>Envoyer Email</span>
            </button>
          )}

          {onRequestSignature && document.status !== "SIGNED" && document.status !== "ACCEPTED" && (
            <button
              type="button"
              onClick={onRequestSignature}
              className="inline-flex items-center px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              title="Générer le lien sécurisé de signature électronique"
            >
              <PenTool className="w-4 h-4 mr-1.5" />
              <span>Demander Signature</span>
            </button>
          )}

          {onCreateInvoice && document.documentType === "PROFORMA" && (
            <button
              type="button"
              onClick={onCreateInvoice}
              className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
              title="Convertir en Facture Comptable Définitive"
            >
              <FileCheck className="w-4 h-4 mr-1.5" />
              <span>Créer la Facture</span>
            </button>
          )}

          {onRecordPayment && (document.documentType === "INVOICE" || document.documentType === "ADVANCE_PAYMENT") && document.status !== "PAID" && (
            <button
              type="button"
              onClick={onRecordPayment}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-sm"
              title="Enregistrer un règlement / Payer la facture"
            >
              <CreditCard className="w-4 h-4 mr-1.5" />
              <span>Payer</span>
            </button>
          )}

          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="inline-flex items-center p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Dupliquer le document"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER */}
      <div className="overflow-x-auto pb-8 flex justify-center">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
          className="w-full flex justify-center"
        >
          {workspaceSlug === "automobile" ? (
            <AutomobileProformaTemplate
              document={document}
              seller={seller}
              client={client}
              lines={lines}
              signatureClient={signatureClient}
              signatureSeller={signatureSeller}
            />
          ) : (
            <NetworkProformaTemplate
              document={document}
              seller={seller}
              client={client}
              lines={lines}
              signatureClient={signatureClient}
              signatureSeller={signatureSeller}
            />
          )}
        </div>
      </div>
    </div>
  );
}
