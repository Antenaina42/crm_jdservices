import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Car,
  Server,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Receipt,
  Users,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function SuperAdminConsolidatedPage() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/workspace-select");
  }

  // Récupérer les deux workspaces
  const autoWorkspace = await prisma.workspace.findUnique({ where: { slug: "automobile" } });
  const netWorkspace = await prisma.workspace.findUnique({ where: { slug: "network" } });

  if (!autoWorkspace || !netWorkspace) redirect("/workspace-select");

  // Données Automobile
  const [autoClients, autoProformas, autoInvoices] = await Promise.all([
    prisma.client.count({ where: { workspaceId: autoWorkspace.id } }),
    prisma.documentRecord.count({ where: { workspaceId: autoWorkspace.id, documentType: "PROFORMA" } }),
    prisma.documentRecord.findMany({
      where: { workspaceId: autoWorkspace.id, documentType: "INVOICE", status: { notIn: ["CANCELLED", "DRAFT"] } },
      select: { totalHt: true, totalTtc: true, totalPaid: true, balanceDue: true },
    }),
  ]);

  const autoCaHt = autoInvoices.reduce((acc, curr) => acc + curr.totalHt, 0);
  const autoCaTtc = autoInvoices.reduce((acc, curr) => acc + curr.totalTtc, 0);
  const autoCollected = autoInvoices.reduce((acc, curr) => acc + curr.totalPaid, 0);

  // Données Réseau
  const [netClients, netProformas, netInvoices] = await Promise.all([
    prisma.client.count({ where: { workspaceId: netWorkspace.id } }),
    prisma.documentRecord.count({ where: { workspaceId: netWorkspace.id, documentType: "PROFORMA" } }),
    prisma.documentRecord.findMany({
      where: { workspaceId: netWorkspace.id, documentType: "INVOICE", status: { notIn: ["CANCELLED", "DRAFT"] } },
      select: { totalHt: true, totalTtc: true, totalPaid: true, balanceDue: true },
    }),
  ]);

  const netCaHt = netInvoices.reduce((acc, curr) => acc + curr.totalHt, 0);
  const netCaTtc = netInvoices.reduce((acc, curr) => acc + curr.totalTtc, 0);
  const netCollected = netInvoices.reduce((acc, curr) => acc + curr.totalPaid, 0);

  // Totaux Consolidés
  const totalClients = autoClients + netClients;
  const totalCaHt = autoCaHt + netCaHt;
  const totalCaTtc = autoCaTtc + netCaTtc;
  const totalCollected = autoCollected + netCollected;

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <Link
          href="/workspace-select"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Retour au sélecteur d&apos;espace
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Synthèse Consolidée Multi-Activités — Super Admin
            </h1>
            <p className="text-xs text-slate-500">
              Vue financière consolidée garantissant l&apos;étanchéité stricte des deux activités
            </p>
          </div>
        </div>
      </div>

      {/* SYNTHÈSE TOTALE CONSOLIDÉE */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          JD-SERVICES MANAGEMENT • TOTAL ENTREPRISE
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-2">
          <div>
            <span className="text-slate-400 text-xs block">Clients Répartis</span>
            <span className="text-3xl font-black text-white">{totalClients}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Chiffre d&apos;Affaires HT</span>
            <span className="text-3xl font-black text-white">{formatCurrency(totalCaHt)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Total Facturé TTC</span>
            <span className="text-3xl font-black text-amber-400">{formatCurrency(totalCaTtc)}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Total Encaissé</span>
            <span className="text-3xl font-black text-emerald-400">{formatCurrency(totalCollected)}</span>
          </div>
        </div>
      </div>

      {/* DEUX GRANDES CARTES SÉPARÉES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CARTE AUTOMOBILE */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Activité 1</span>
                <h2 className="text-lg font-black text-slate-900">IMPORT AUTOMOBILE</h2>
              </div>
            </div>
            <Link
              href="/automobile/dashboard"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center"
            >
              Dashboard Auto <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block">Clients Auto</span>
              <strong className="text-xl font-black text-slate-900">{autoClients}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block">Proformas Auto</span>
              <strong className="text-xl font-black text-slate-900">{autoProformas}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block">Facturé TTC</span>
              <strong className="text-base font-black text-slate-900">{formatCurrency(autoCaTtc)}</strong>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl">
              <span className="text-slate-400 block">Encaissé Auto</span>
              <strong className="text-base font-black text-emerald-600">{formatCurrency(autoCollected)}</strong>
            </div>
          </div>
        </div>

        {/* CARTE RÉSEAU */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-700 text-white flex items-center justify-center">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Activité 2</span>
                <h2 className="text-lg font-black text-slate-900">ACCOMPAGNEMENT RÉSEAU</h2>
              </div>
            </div>
            <Link
              href="/network/dashboard"
              className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center"
            >
              Dashboard Réseau <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-cyan-50/50 rounded-2xl">
              <span className="text-slate-400 block">Clients Réseau B2B</span>
              <strong className="text-xl font-black text-slate-900">{netClients}</strong>
            </div>
            <div className="p-3 bg-cyan-50/50 rounded-2xl">
              <span className="text-slate-400 block">Proformas IT</span>
              <strong className="text-xl font-black text-slate-900">{netProformas}</strong>
            </div>
            <div className="p-3 bg-cyan-50/50 rounded-2xl">
              <span className="text-slate-400 block">Facturé TTC</span>
              <strong className="text-base font-black text-slate-900">{formatCurrency(netCaTtc)}</strong>
            </div>
            <div className="p-3 bg-cyan-50/50 rounded-2xl">
              <span className="text-slate-400 block">Encaissé Réseau</span>
              <strong className="text-base font-black text-teal-600">{formatCurrency(netCollected)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
