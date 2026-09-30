"use client";

import React from "react";
import Image from "next/image";
import { formatCurrency, formatDateFr, numberToWordsFr } from "@/lib/utils";

interface AutomobileProformaTemplateProps {
  document: {
    documentNumber: string;
    documentType?: string;
    date: Date | string;
    dueDate?: Date | string;
    notes?: string | null;
    internalNotes?: string | null;
    specialMentions?: string | null;
    totalHt: number;
    totalTax: number;
    totalTtc: number;
    advancePercentage?: number;
    status: string;
    documentHash?: string | null;
  };
  seller: {
    companyName: string;
    legalForm?: string;
    siren?: string;
    siret?: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    phone: string;
    email: string;
  };
  client: {
    isCompany?: boolean;
    companyName?: string | null;
    firstName: string;
    lastName: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
    phone?: string;
    email?: string;
  };
  lines: Array<{
    id?: string;
    designation: string;
    description?: string | null;
    quantity: number;
    unit: string;
    unitPriceHt: number;
    taxRate: number;
    totalHt: number;
    totalTtc: number;
  }>;
  signatureClient?: {
    signedAt: Date | string;
    signerName: string;
    ipAddress?: string;
    evidenceId?: string;
  } | null;
  signatureSeller?: {
    signedAt: Date | string;
    signerName: string;
    certified: boolean;
  } | null;
}

export default function AutomobileProformaTemplate({
  document,
  seller,
  client,
  lines,
  signatureClient,
  signatureSeller,
}: AutomobileProformaTemplateProps) {
  const clientFullName = client.isCompany && client.companyName
    ? client.companyName
    : `${client.firstName} ${client.lastName}`.trim();

  const isInvoice = document.documentType === "INVOICE";
  const isCreditNote = document.documentType === "CREDIT_NOTE";
  const isAdvancePayment = document.documentType === "ADVANCE_PAYMENT";
  const docTitle = isCreditNote
    ? "FACTURE D'AVOIR"
    : isAdvancePayment
    ? "FACTURE D'ACOMPTE"
    : isInvoice
    ? "FACTURE"
    : "FACTURE PROFORMA";

  const docNumberLabel = isCreditNote
    ? "AVOIR N° :"
    : isAdvancePayment
    ? "FACTURE D'ACOMPTE N° :"
    : isInvoice
    ? "FACTURE N° :"
    : "FACTURE PROFORMA N° :";

  // Date formatée JJ / MM / AAAA comme dans la référence PDF
  const d = new Date(document.date);
  const formattedDate = `${String(d.getDate()).padStart(2, "0")} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${d.getFullYear()}`;

  const spelledOutTotal = numberToWordsFr(document.totalTtc);

  return (
    <div className="print-page bg-white text-[#111111] font-sans max-w-[800px] mx-auto p-8 sm:p-12 shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
      {/* HEADER SECTION */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          {/* Logo officiel JD-Services */}
          <div className="text-2xl font-black tracking-tight text-slate-900 leading-none">
            JD-Services
          </div>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
            Services d&apos;accompagnement import automobile
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            {docTitle}
          </h1>
          <div className="text-xs font-bold text-slate-800 tracking-wider mt-1">
            {docNumberLabel} {document.documentNumber}
          </div>
          {isInvoice && (
            <div className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider mt-0.5">
              Document Comptable Définitivement Émis
            </div>
          )}
          {isAdvancePayment && (
            <div className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider mt-0.5">
              Facture d&apos;Acompte • Art. 289-I-1-c CGI
            </div>
          )}
        </div>
      </div>

      {/* DATE & ACTORS INFO */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">
          <div>DATE : {formattedDate}</div>
          {!isInvoice && !isCreditNote && !isAdvancePayment ? (
            <div className="inline-flex items-center px-3 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-extrabold text-xs shadow-2xs">
              <span className="mr-1.5">⏳</span> Validité de l&apos;offre : 1 mois
            </div>
          ) : document.dueDate ? (
            <div className="text-slate-800 text-xs font-bold">
              ÉCHÉANCE DE RÈGLEMENT : {formatDateFr(document.dueDate)}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs leading-relaxed">
          {/* ÉMETTEUR */}
          <div>
            <div className="font-extrabold text-slate-900 uppercase tracking-wider mb-2">
              ÉMETTEUR :
            </div>
            <div className="font-bold text-slate-900 text-sm">
              {seller.companyName}
            </div>
            <div className="text-slate-600">
              {seller.legalForm || "SASU"}
            </div>
            <div className="text-slate-700 mt-1">
              <span className="font-medium">Siège social :</span> {seller.address}, {seller.postalCode} {seller.city}, {seller.country}
            </div>
            <div className="text-slate-700">
              <span className="font-medium">Numéro SIRET / RCS :</span> {seller.siret || seller.siren || "130419377"}
            </div>
            <div className="text-slate-700">
              <span className="font-medium">Téléphone :</span> {seller.phone || "06.25.98.67.23"}
            </div>
            <div className="text-slate-700">
              <span className="font-medium">Email :</span> {seller.email || "contact@jd-services.fr"}
            </div>
          </div>

          {/* DESTINATAIRE */}
          <div className="pl-4 sm:pl-8">
            <div className="font-extrabold text-slate-900 uppercase tracking-wider mb-2">
              DESTINATAIRE :
            </div>
            <div className="font-black text-slate-900 text-sm">
              {clientFullName}
            </div>
            <div className="text-slate-700 mt-1">
              {client.address}
            </div>
            <div className="text-slate-700">
              {client.postalCode} {client.city}, {client.country}
            </div>
            {client.phone && (
              <div className="text-slate-700 mt-1">
                <span className="font-medium">Tél :</span> {client.phone}
              </div>
            )}
            {client.email && (
              <div className="text-slate-700">
                <span className="font-medium">Email :</span> {client.email}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE DES PRESTATIONS */}
      <div className="mt-8 mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-slate-900 text-slate-900 font-extrabold">
              <th className="py-2 text-left w-3/5">Description :</th>
              <th className="py-2 text-center w-1/5">Prix Unitaire (€) :</th>
              <th className="py-2 text-center w-1/10">Quantité :</th>
              <th className="py-2 text-right w-1/10">Total :</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lines.map((line, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-3.5 pr-4 text-slate-800 font-medium">
                  {line.designation}
                  {line.description && (
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      {line.description}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-2 text-center text-slate-900">
                  {line.unitPriceHt.toFixed(0)}
                </td>
                <td className="py-3.5 px-2 text-center text-slate-900">
                  {line.quantity} {line.unit !== "Forfait" && line.unit !== "Unité" ? line.unit : ""}
                </td>
                <td className="py-3.5 pl-2 text-right font-semibold text-slate-900">
                  {line.totalHt.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALS SECTION */}
      <div className="mt-8 pt-4 border-t-2 border-slate-900 flex justify-end">
        <div className="w-64 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-900 font-bold">
            <span>TOTAL HT :</span>
            <span className="text-sm font-black">{document.totalHt.toFixed(0)} €</span>
          </div>
          <div className="flex justify-between items-center text-slate-900 font-bold">
            <span>TVA 20% :</span>
            <span className="text-sm font-black">{document.totalTax.toFixed(0)} €</span>
          </div>
          <div className="flex justify-between items-center text-slate-900 font-extrabold text-sm border-t border-slate-300 pt-2">
            <span>TOTAL TTC :</span>
            <span className="text-base font-black">{document.totalTtc.toFixed(0)} €</span>
          </div>
        </div>
      </div>

      {/* TEXT SUM IN WORDS */}
      <div className="mt-6 text-xs text-slate-900 font-semibold italic">
        Arrêté la présente facture à la somme de {spelledOutTotal}.
      </div>

      {/* NOTES COMPLÉMENTAIRES */}
      {document.notes && (
        <div className="mt-4 text-xs font-bold text-slate-900">
          {document.notes}
        </div>
      )}

      {/* CADRE RÉSERVÉ JD-SERVICES */}
      {document.internalNotes && (
        <div className="mt-6">
          <div className="text-xs font-bold text-slate-900 mb-1.5">
            Cadre réserver JD-Services
          </div>
          <div className="border border-slate-800 rounded-lg p-3 text-xs text-slate-800 max-w-sm min-h-[50px] bg-slate-50/30">
            {document.internalNotes}
          </div>
        </div>
      )}

      {/* MENTIONS LÉGALES & VALIDITÉ (1 MOIS) */}
      {!isInvoice && !isCreditNote ? (
        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-[10px] text-amber-950 leading-relaxed">
          <strong>Durée de validité de l&apos;offre : 1 mois</strong> (30 jours) à compter de sa date d&apos;émission. Passé ce délai, les tarifs et disponibilités des prestations et véhicules pourront faire l&apos;objet d&apos;une réévaluation. Ce document constitue un devis / facture proforma préalable et ne constitue pas une facture comptable définitive avant acceptation.
        </div>
      ) : (
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700 leading-relaxed">
          <strong>Conditions de règlement &amp; pénalités légales :</strong> Règlement par virement bancaire sous 30 jours à réception. En cas de retard de paiement, application de plein droit de pénalités au taux légal majoré ainsi qu&apos;une indemnité forfaitaire pour frais de recouvrement de 40 € (Code de commerce art. L441-9 et D441-5). Pas d&apos;escompte pour paiement anticipé.
        </div>
      )}

      {/* SIGNATURES SECTION */}
      <div className="mt-8 grid grid-cols-2 gap-8 pt-4">
        {/* Client Signature Box */}
        <div>
          <div className="text-xs font-bold text-slate-900 mb-2">
            {clientFullName}
          </div>
          <div className="border border-slate-800 rounded-xl p-4 h-28 flex flex-col justify-between text-xs relative bg-white">
            {signatureClient ? (
              <div className="flex flex-col justify-between h-full text-emerald-800">
                <div className="font-semibold flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 inline-block"></span>
                  Document validé &amp; signé en ligne
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Signé par : {signatureClient.signerName}<br />
                  Le {formatDateFr(signatureClient.signedAt)} • IP : {signatureClient.ipAddress || "Certifiée"}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic text-[11px] flex items-center justify-center h-full">
                Mention « Bon pour accord » &amp; Signature
              </div>
            )}
          </div>
        </div>

        {/* JD-Services Signature Box */}
        <div>
          <div className="text-xs font-bold text-slate-900 mb-2">
            JD-Services
          </div>
          <div className="border border-slate-800 rounded-xl p-4 h-28 flex flex-col justify-between text-xs relative bg-white">
            {signatureSeller ? (
              <div className="flex flex-col justify-between h-full text-slate-900">
                <div className="font-bold flex items-center text-blue-900">
                  <span className="w-2 h-2 rounded-full bg-blue-600 mr-1.5 inline-block"></span>
                  Signature Électronique Certifiée
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Émis par Jean-Désiré Martialino SASU<br />
                  Horodatage : {formatDateFr(signatureSeller.signedAt)}
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-between h-full">
                <div className="font-semibold text-slate-700">
                  Jean-Désiré Martialino
                </div>
                <div className="text-[10px] text-slate-400">
                  Gérant — JD-Services SASU
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER OF DOCUMENT */}
      <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 leading-normal">
        <div className="font-bold text-slate-700">
          JD-Services - Services d&apos;accopagnement import auto
        </div>
        <div>
          60 rue de l&apos;égalité, 69800 Saint-Priest, France
        </div>
        {document.documentHash && (
          <div className="mt-1 font-mono text-[9px] text-slate-400">
            Empreinte d&apos;intégrité SHA-256 : {document.documentHash.slice(0, 32)}...
          </div>
        )}
      </div>
    </div>
  );
}
