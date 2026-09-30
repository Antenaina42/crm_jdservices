import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import Link from "next/link";
import {
  Users,
  Car,
  FileSpreadsheet,
  Receipt,
  PenTool,
  Clock,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileCheck,
  Shield,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateFr } from "@/lib/utils";
import { DocumentType, DocumentStatus, ClientStatus } from "@prisma/client";

export default async function AutomobileDashboardPage() {
  const { workspace, user } = await requireWorkspace("automobile");

  // Requêtes serveur strictement isolées au workspaceId automobile
  const workspaceId = workspace.id;

  const [clientsCount, prospectsCount, activeProjectsCount] = await Promise.all([
    prisma.client.count({ where: { workspaceId, status: ClientStatus.ACTIVE } }),
    prisma.client.count({ where: { workspaceId, status: ClientStatus.PROSPECT } }),
    prisma.project.count({ where: { workspaceId, status: "IN_PROGRESS" } }),
  ]);

  const [proformasSent, proformasAccepted, invoicesIssued, invoicesPaid, signaturesPending] = await Promise.all([
    prisma.documentRecord.count({ where: { workspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.SENT } }),
    prisma.documentRecord.count({ where: { workspaceId, documentType: DocumentType.PROFORMA, status: DocumentStatus.ACCEPTED } }),
    prisma.documentRecord.count({ where: { workspaceId, documentType: DocumentType.INVOICE, status: { in: [DocumentStatus.ISSUED, DocumentStatus.SENT, DocumentStatus.PARTIALLY_PAID] } } }),
    prisma.documentRecord.count({ where: { workspaceId, documentType: DocumentType.INVOICE, status: DocumentStatus.PAID } }),
    prisma.signatureRequest.count({ where: { workspaceId, status: "PENDING" } }),
  ]);

  // Documents récents
  const recentDocuments = await prisma.documentRecord.findMany({
    where: { workspaceId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Chiffre d'affaires Automobile
  const invoices = await prisma.documentRecord.findMany({
    where: {
      workspaceId,
      documentType: DocumentType.INVOICE,
      status: { notIn: [DocumentStatus.CANCELLED, DocumentStatus.DRAFT] },
    },
    select: { totalHt: true, totalTax: true, totalTtc: true, totalPaid: true, balanceDue: true },
  });

  const caHt = invoices.reduce((acc, curr) => acc + curr.totalHt, 0);
  const caTtc = invoices.reduce((acc, curr) => acc + curr.totalTtc, 0);
  const caEncaissé = invoices.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const caARecevoir = invoices.reduce((acc, curr) => acc + curr.balanceDue, 0);

  // Événements d'audit récents pour le fil d'activité
  const auditEvents = await prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { timestamp: "desc" },
    take: 6,
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <div className="space-y-8">
        {/* Banner Bienvenue Automobile */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <Car className="w-3.5 h-3.5" />
              <span>Espace Import Automobile • Référence Modèle Morel Hortense</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tableau de Bord — Import Automobile
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl">
              Gestion des dossiers d&apos;accompagnement à l&apos;importation européenne, vente sécurisée, proformas et factures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/automobile/proformas/new"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nouvelle Proforma Auto
            </Link>
            <Link
              href="/automobile/clients?new=true"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Nouveau Client
            </Link>
          </div>
        </div>

        {/* GRILLE DES KPIS METIER */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Clients Actifs</div>
            <div className="text-2xl font-black text-slate-900">{clientsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">{prospectsCount} prospects en pipeline</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Projets en cours</div>
            <div className="text-2xl font-black text-blue-600">{activeProjectsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Imports &amp; Ventes</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Proformas Envoyées</div>
            <div className="text-2xl font-black text-amber-600">{proformasSent}</div>
            <div className="text-[11px] text-emerald-600 mt-1 font-semibold">{proformasAccepted} acceptées</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Factures Émises</div>
            <div className="text-2xl font-black text-slate-900">{invoicesIssued}</div>
            <div className="text-[11px] text-teal-600 mt-1 font-semibold">{invoicesPaid} soldées</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Signatures en attente</div>
            <div className="text-2xl font-black text-emerald-600">{signaturesPending}</div>
            <div className="text-[11px] text-slate-400 mt-1">Portail client en ligne</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">CA Encaissé</div>
            <div className="text-xl font-black text-slate-900 truncate">{formatCurrency(caEncaissé)}</div>
            <div className="text-[11px] text-amber-600 mt-1 font-semibold">À recevoir : {formatCurrency(caARecevoir)}</div>
          </div>
        </div>

        {/* SECTION METIER : DOCUMENTS RÉCENTS & ACTIVITÉ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Documents Table (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Documents Automobiles Récents</h2>
                <p className="text-xs text-slate-500">Proformas et factures de l&apos;espace automobile</p>
              </div>
              <Link
                href="/automobile/proformas"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center"
              >
                Tout voir <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-left">
                    <th className="py-2.5">Numéro</th>
                    <th className="py-2.5">Client</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5 text-right">Montant TTC</th>
                    <th className="py-2.5 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocuments.map((doc) => {
                    const clientName = doc.client.isCompany && doc.client.companyName
                      ? doc.client.companyName
                      : `${doc.client.firstName} ${doc.client.lastName}`.trim();
                    const viewUrl = `/automobile/${doc.documentType === "PROFORMA" ? "proformas" : "invoices"}/${doc.id}`;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition group">
                        <td className="py-3 font-bold text-slate-900">
                          <Link href={viewUrl} className="group-hover:text-blue-600 transition">
                            {doc.documentNumber}
                          </Link>
                        </td>
                        <td className="py-3 text-slate-700 font-medium">{clientName}</td>
                        <td className="py-3 text-slate-500">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="py-3 text-right font-black text-slate-900">{formatCurrency(doc.totalTtc)}</td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              doc.status === "PAID"
                                ? "bg-teal-50 text-teal-700"
                                : doc.status === "ACCEPTED" || doc.status === "SIGNED"
                                ? "bg-emerald-50 text-emerald-700"
                                : doc.status === "SENT"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity / Audit Feed (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Activité Récente</h2>
                <p className="text-xs text-slate-500">Traçabilité et audit des événements</p>
              </div>
              <Link
                href="/settings/audit-log"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center"
              >
                Journal complet <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {auditEvents.map((evt) => {
                const dateStr = new Date(evt.timestamp).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={evt.id} className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate">
                          {evt.entityReference || evt.entityType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{dateStr}</span>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Action : <span className="font-semibold text-slate-800">{evt.action}</span> par {evt.userEmail || "Système"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CADRE MODÈLE FOURNI RÉFÉRENCE MOREL HORTENSE */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Référence Conforme : Morel Hortense (M10696MDB46468)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black">
              Modèle Proforma Automobile Validé
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Le dossier Antigravity contient la facture proforma de référence de MOREL Hortense pour l&apos;import BMW X5. Les services configurés (Check sur place 650 €, Rapatriement remorque 250 €, Plaques WW 100 €) totalisent 1 200 € TTC avec la mention « Carburant aller/retour + péage en SUS ».
            </p>
          </div>

          <Link
            href="/automobile/proformas"
            className="flex-shrink-0 px-5 py-3 rounded-2xl bg-white text-slate-900 font-black text-xs hover:bg-slate-100 transition shadow-lg"
          >
            Consulter la proforma M10696MDB46468 &rarr;
          </Link>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
