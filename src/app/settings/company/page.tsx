import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Building, ArrowLeft, CheckCircle2, Shield } from "lucide-react";

export default async function CompanySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const workspaces = await prisma.workspace.findMany({
    orderBy: { slug: "asc" },
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Retour aux paramètres
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Building className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Paramètres Entreprise &amp; Mentions Légales
            </h1>
            <p className="text-xs text-slate-500">
              Coordonnées de facturation des espaces Automobile et Réseau
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {workspaces.map((ws) => (
          <div key={ws.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-900">{ws.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  {ws.slug.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Raison Sociale</span>
                <strong className="text-slate-900">{ws.companyName} ({ws.legalForm})</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">SIREN / SIRET</span>
                <strong className="text-slate-900 font-mono">{ws.siren} / {ws.siret}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">N° TVA Intracommunautaire</span>
                <strong className="text-slate-900 font-mono">{ws.vatNumber}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Siège Social</span>
                <strong className="text-slate-900">{ws.address}, {ws.postalCode} {ws.city}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact</span>
                <strong className="text-slate-900">{ws.phone} • {ws.email}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Site Internet</span>
                <strong className="text-blue-600 truncate block">{ws.website || "-"}</strong>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-[11px] text-slate-600 space-y-1">
              <div><strong className="text-slate-800">Pied de page imprimé :</strong> {ws.footerText}</div>
              <div><strong className="text-slate-800">Mentions pénalités :</strong> {ws.legalNotice}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
