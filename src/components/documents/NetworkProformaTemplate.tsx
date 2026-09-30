"use client";

import React from "react";
import { formatCurrency, formatDateFr, numberToWordsFr } from "@/lib/utils";
import { Server, Shield, Cpu, Network, CheckCircle2 } from "lucide-react";

interface NetworkProformaTemplateProps {
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
    paymentTerms?: string | null;
    status: string;
    documentHash?: string | null;
  };
  seller: {
    companyName: string;
    commercialName?: string | null;
    legalForm?: string;
    siren?: string;
    siret?: string;
    vatNumber?: string;
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
    siren?: string | null;
    vatNumber?: string | null;
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
  } | null;
  signatureSeller?: {
    signedAt: Date | string;
    signerName: string;
  } | null;
}

export default function NetworkProformaTemplate({
  document,
  seller,
  client,
  lines,
  signatureClient,
  signatureSeller,
}: NetworkProformaTemplateProps) {
  const clientTitle = client.companyName || `${client.firstName} ${client.lastName}`.trim();
  const isInvoice = document.documentType === "INVOICE";
  const docTitle = isInvoice ? "FACTURE D'INFRASTRUCTURE RÉSEAU" : "FACTURE PROFORMA RÉSEAU";

  return (
    <div className="print-page bg-white text-slate-900 font-sans max-w-[850px] mx-auto p-8 sm:p-12 shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0">
      {/* IT High-Tech Top Accent Bar */}
      <div className="h-2.5 bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-800 rounded-t-sm mb-6"></div>

      {/* HEADER SECTION */}
      <div className="flex items-start justify-between pb-6 border-b border-cyan-100">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-800 flex items-center justify-center text-white shadow-md">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight">
              JD-SERVICES
            </div>
            <div className="text-xs font-bold text-cyan-800 uppercase tracking-wider">
              Accompagnement Réseau &amp; Infrastructure IT
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Audit • Câblage • Firewall UTM • Wi-Fi 6 • Infogérance M1/M2/M3
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block px-3 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-900 font-black text-xs uppercase tracking-wider mb-1.5">
            {docTitle}
          </div>
          <div className="text-sm font-extrabold text-slate-900">
            N° : {document.documentNumber}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Émis le : {formatDateFr(document.date)}
          </div>
          {document.dueDate && (
            <div className="text-xs font-semibold text-cyan-900">
              Échéance : {formatDateFr(document.dueDate)}
            </div>
          )}
        </div>
      </div>

      {/* ACTORS GRID */}
      <div className="grid grid-cols-2 gap-8 my-8 text-xs">
        {/* ÉMETTEUR / PRESTATAIRE */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
          <div className="font-bold text-cyan-900 uppercase tracking-wider mb-2 flex items-center">
            <Shield className="w-3.5 h-3.5 mr-1 text-cyan-700" />
            Prestataire IT &amp; Réseau :
          </div>
          <div className="font-extrabold text-slate-900 text-sm">
            {seller.companyName}
          </div>
          <div className="text-slate-600 font-medium">
            {seller.commercialName || "Accompagnement Réseau & Cybersécurité"}
          </div>
          <div className="text-slate-600 mt-1.5 leading-relaxed">
            {seller.address}<br />
            {seller.postalCode} {seller.city} — {seller.country}<br />
            SIREN : {seller.siren || "130419377"} • RCS Lyon<br />
            Tél : {seller.phone} • Email : {seller.email}
          </div>
        </div>

        {/* CLIENT DESTINATAIRE */}
        <div className="p-4 rounded-xl bg-cyan-50/40 border border-cyan-200/80">
          <div className="font-bold text-cyan-900 uppercase tracking-wider mb-2 flex items-center">
            <Network className="w-3.5 h-3.5 mr-1 text-cyan-700" />
            Client Professionnel :
          </div>
          <div className="font-extrabold text-slate-900 text-sm">
            {clientTitle}
          </div>
          {client.isCompany && client.firstName && (
            <div className="text-slate-600 font-medium">
              Attn : {client.firstName} {client.lastName}
            </div>
          )}
          <div className="text-slate-600 mt-1.5 leading-relaxed">
            {client.address}<br />
            {client.postalCode} {client.city} — {client.country}<br />
            {client.siren && <span>SIREN : {client.siren}<br /></span>}
            {client.vatNumber && <span>N° TVA : {client.vatNumber}<br /></span>}
            {client.phone && <span>Tél : {client.phone} • </span>}
            {client.email && <span>{client.email}</span>}
          </div>
        </div>
      </div>

      {/* TABLE DES PRESTATIONS RÉSEAU */}
      <div className="my-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-900 text-white font-bold rounded-t-lg">
              <th className="py-2.5 px-3 text-left rounded-tl-lg">Prestation &amp; Description Technique</th>
              <th className="py-2.5 px-2 text-center w-16">Qté</th>
              <th className="py-2.5 px-2 text-center w-20">Unité</th>
              <th className="py-2.5 px-2 text-right w-24">Prix HT</th>
              <th className="py-2.5 px-2 text-center w-16">TVA</th>
              <th className="py-2.5 px-3 text-right w-24 rounded-tr-lg">Total HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 border-x border-b border-slate-200">
            {lines.map((line, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900">{line.designation}</div>
                  {line.description && (
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {line.description}
                    </div>
                  )}
                </td>
                <td className="py-3 px-2 text-center font-medium text-slate-800">{line.quantity}</td>
                <td className="py-3 px-2 text-center text-slate-600">{line.unit}</td>
                <td className="py-3 px-2 text-right font-medium text-slate-800">{line.unitPriceHt.toFixed(2)} €</td>
                <td className="py-3 px-2 text-center text-slate-600">{line.taxRate}%</td>
                <td className="py-3 px-3 text-right font-bold text-slate-900">{line.totalHt.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTALS & CONDITIONS */}
      <div className="grid grid-cols-12 gap-6 my-6 pt-2">
        <div className="col-span-7 space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900 mb-1">Conditions de règlement :</div>
            <div className="text-slate-600 leading-relaxed">
              {document.paymentTerms || "Paiement à 30 jours date d'émission par virement SEPA."}
            </div>
            {document.notes && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-slate-700 font-medium">
                Note : {document.notes}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Arrêté à la somme de : {numberToWordsFr(document.totalTtc)}.
          </div>
        </div>

        <div className="col-span-5 p-4 rounded-xl bg-cyan-900 text-white space-y-2 text-xs">
          <div className="flex justify-between items-center text-cyan-200">
            <span>TOTAL HT :</span>
            <span className="font-bold text-sm text-white">{document.totalHt.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between items-center text-cyan-200">
            <span>TVA (20%) :</span>
            <span className="font-bold text-sm text-white">{document.totalTax.toFixed(2)} €</span>
          </div>
          <div className="pt-2 border-t border-cyan-800 flex justify-between items-center font-black">
            <span className="text-sm">TOTAL TTC :</span>
            <span className="text-lg text-cyan-300">{document.totalTtc.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      {/* SIGNATURES SECTION */}
      <div className="grid grid-cols-2 gap-6 mt-8 pt-4 border-t border-slate-200 text-xs">
        <div>
          <div className="font-bold text-slate-800 mb-2">Accord &amp; Bon pour Commande Client :</div>
          <div className="border border-slate-300 rounded-xl p-3 h-28 flex flex-col justify-between bg-white">
            {signatureClient ? (
              <div className="text-emerald-700 flex flex-col justify-between h-full">
                <div className="font-bold flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                  Signé électroniquement
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Signataire : {signatureClient.signerName}<br />
                  Le {formatDateFr(signatureClient.signedAt)} • {signatureClient.ipAddress || "Certifié"}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic text-[11px] flex items-center justify-center h-full">
                Date, cachet commercial &amp; signature
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="font-bold text-slate-800 mb-2">Pour JD-SERVICES Réseau :</div>
          <div className="border border-slate-300 rounded-xl p-3 h-28 flex flex-col justify-between bg-white">
            <div className="font-semibold text-slate-900">
              Jean-Désiré Martialino
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Direction Technique &amp; Réseaux<br />
              Certifié conforme • eIDAS Ready
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500 leading-normal">
        <div className="font-bold text-slate-700">
          JD-SERVICES SASU — Accompagnement Réseau &amp; Infrastructure IT
        </div>
        <div>
          60 rue de l&apos;égalité, 69800 Saint-Priest • SIREN : 130419377 • TVA : FR130419377
        </div>
        <div>
          Pénalités de retard : 3 fois le taux légal. Indemnité forfaitaire de recouvrement : 40 € (Code de commerce).
        </div>
        {document.documentHash && (
          <div className="mt-1 font-mono text-[9px] text-slate-400">
            Hash SHA-256 : {document.documentHash}
          </div>
        )}
      </div>
    </div>
  );
}
