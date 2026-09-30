import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import Link from "next/link";
import {
  Server,
  Network,
  Shield,
  Wifi,
  Cpu,
  Layers,
  Receipt,
  FileSpreadsheet,
  Users,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  HardDrive,
  Activity,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateFr } from "@/lib/utils";
import { DocumentType, DocumentStatus, ClientStatus } from "@prisma/client";

export default async function NetworkDashboardPage() {
  const { workspace, user } = await requireWorkspace("network");

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

  // Contrats M1 / M2 / M3 actifs
  const [m1Count, m2Count, m3Count] = await Promise.all([
    prisma.project.count({ where: { workspaceId, networkPlanLevel: "M1" } }),
    prisma.project.count({ where: { workspaceId, networkPlanLevel: "M2" } }),
    prisma.project.count({ where: { workspaceId, networkPlanLevel: "M3" } }),
  ]);

  // Documents récents réseau
  const recentDocuments = await prisma.documentRecord.findMany({
    where: { workspaceId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Chiffre d'affaires Réseau
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

  // Activité récente
  const auditEvents = await prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { timestamp: "desc" },
    take: 6,
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <div className="space-y-8">
        {/* Banner Bienvenue Réseau */}
        <div className="bg-gradient-to-r from-sky-900 via-cyan-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-400/30">
              <Server className="w-3.5 h-3.5" />
              <span>Espace Infrastructure &amp; Accompagnement IT • Contrats M1 / M2 / M3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tableau de Bord — Accompagnement Réseau
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-cyan-100 max-w-xl">
              Supervision de l&apos;infrastructure B2B, administration pare-feu, infogérance réseau et facturation récurrente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/network/proformas/new"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nouvelle Proforma Réseau
            </Link>
            <Link
              href="/network/clients?new=true"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Nouveau Client Entreprise
            </Link>
          </div>
        </div>

        {/* WIDGETS SPÉCIFIQUES RÉSEAU : OFFRES M1 / M2 / M3 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 uppercase tracking-wider">
                Contrat M1 — Essentiel
              </span>
              <div className="text-2xl font-black text-slate-900 mt-2">{m1Count} parc(s)</div>
              <div className="text-xs text-slate-500 mt-0.5">Supervision 24/7 &amp; MCO</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-cyan-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-50 text-cyan-800 uppercase tracking-wider">
                Contrat M2 — Professionnel
              </span>
              <div className="text-2xl font-black text-cyan-800 mt-2">{m2Count} parc(s)</div>
              <div className="text-xs text-slate-500 mt-0.5">Firewall, MCO &amp; Support J+1</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                Contrat M3 — Entreprise
              </span>
              <div className="text-2xl font-black text-indigo-900 mt-2">{m3Count} parc(s)</div>
              <div className="text-xs text-slate-500 mt-0.5">Infogérance intégrale &amp; Astreinte H+4</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* GRILLE KPIS METIER */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Entreprises Clientes</div>
            <div className="text-2xl font-black text-slate-900">{clientsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">{prospectsCount} prospects B2B</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Projets Réseau</div>
            <div className="text-2xl font-black text-cyan-700">{activeProjectsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Audits, Baies, VLANs</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Proformas IT</div>
            <div className="text-2xl font-black text-amber-600">{proformasSent}</div>
            <div className="text-[11px] text-emerald-600 mt-1 font-semibold">{proformasAccepted} validées</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Factures Émises</div>
            <div className="text-2xl font-black text-slate-900">{invoicesIssued}</div>
            <div className="text-[11px] text-teal-600 mt-1 font-semibold">{invoicesPaid} soldées</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Signatures en cours</div>
            <div className="text-2xl font-black text-emerald-600">{signaturesPending}</div>
            <div className="text-[11px] text-slate-400 mt-1">Validation électronique</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">CA Encaissé</div>
            <div className="text-xl font-black text-slate-900 truncate">{formatCurrency(caEncaissé)}</div>
            <div className="text-[11px] text-amber-600 mt-1 font-semibold">À recevoir : {formatCurrency(caARecevoir)}</div>
          </div>
        </div>

        {/* SECTION DOCUMENTS RÉCENTS & ACTIVITÉ IT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Documents Réseau Récents</h2>
                <p className="text-xs text-slate-500">Proformas d&apos;infrastructure et factures de contrats</p>
              </div>
              <Link
                href="/network/proformas"
                className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center"
              >
                Tout voir <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-left">
                    <th className="py-2.5">Numéro</th>
                    <th className="py-2.5">Entreprise</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5 text-right">Montant TTC</th>
                    <th className="py-2.5 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDocuments.map((doc) => {
                    const clientName = doc.client.companyName || `${doc.client.firstName} ${doc.client.lastName}`.trim();
                    const viewUrl = `/network/${doc.documentType === "PROFORMA" ? "proformas" : "invoices"}/${doc.id}`;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition group">
                        <td className="py-3 font-bold text-slate-900">
                          <Link href={viewUrl} className="group-hover:text-cyan-700 transition">
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

          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Journal d&apos;Événements IT</h2>
                <p className="text-xs text-slate-500">Historique des opérations techniques et documents</p>
              </div>
              <Link
                href="/settings/audit-log"
                className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center"
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
                    <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center flex-shrink-0 mt-0.5">
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
      </div>
    </WorkspaceLayout>
  );
}
