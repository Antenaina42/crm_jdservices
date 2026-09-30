import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Percent, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";

export default async function TaxSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const taxRates = await prisma.taxRate.findMany({
    include: { workspace: { select: { slug: true, name: true } } },
    orderBy: { rate: "desc" },
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
            <Percent className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Taux de TVA &amp; Moteur Fiscal Configurable
            </h1>
            <p className="text-xs text-slate-500">
              Gestion dynamique des taux applicables et garantie d&apos;immutabilité historique (taxRateSnapshot)
            </p>
          </div>
        </div>
      </div>

      {/* RÈGLE CRITIQUE D'IMMUTABILITÉ FISCALE */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center text-emerald-400 font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          Principe d&apos;Immutabilité Historique (Snapshot TVA)
        </div>
        <p className="text-slate-300 leading-relaxed">
          Le taux de TVA appliqué à chaque facture est scellé dans le document au moment exact de son émission. Même si un taux est modifié ou désactivé ultérieurement, les anciennes factures conservent intacts leurs montants, taux et calculs d&apos;origine.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Taux de TVA Actifs par Espace
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Espace d&apos;activité</th>
                <th className="py-3 px-4">Désignation</th>
                <th className="py-3 px-4 text-center">Taux (%)</th>
                <th className="py-3 px-4">Régime / Type</th>
                <th className="py-3 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxRates.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {tr.workspace.slug === "automobile" ? "🚗 Automobile" : "🖥️ Réseau"}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{tr.name}</td>
                  <td className="py-3 px-4 text-center font-black text-slate-900 text-sm">
                    {tr.rate}%
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-semibold">{tr.type}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {tr.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
