import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Lock, ArrowLeft, ShieldCheck, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { formatDateFr } from "@/lib/utils";

export default async function RgpdSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const anonymizedClients = await prisma.client.findMany({
    where: { status: "ARCHIVED", anonymizedAt: { not: null } },
    include: { workspace: true },
    orderBy: { anonymizedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-12 w-full space-y-6">
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
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Conformité RGPD &amp; Rétention Légale
            </h1>
            <p className="text-xs text-slate-500">
              Gestion du droit à l&apos;effacement et conciliation avec l&apos;archivage comptable de 10 ans
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
            Droit à l&apos;Effacement (Art. 17 RGPD)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            L&apos;application permet aux administrateurs de purger les données personnelles d&apos;un client (nom, email, téléphone, adresse) à sa demande.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center">
            <AlertCircle className="w-4 h-4 mr-1.5 text-blue-600" />
            Obligation Comptable (Art. L123-22 C. Com.)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Les pièces comptables émises (factures, proformas acceptées) ne sont jamais supprimées et restent scellées pendant 10 ans pour répondre aux exigences du contrôle fiscal.
          </p>
        </div>
      </div>

      {/* Anonymized Clients List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Clients Anonymisés sous Conformité RGPD ({anonymizedClients.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Identifiant Client</th>
                <th className="py-3 px-4">Espace</th>
                <th className="py-3 px-4">Date d&apos;anonymisation</th>
                <th className="py-3 px-4">Motif consigné</th>
                <th className="py-3 px-4 text-center">Statut Pièces Comptables</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anonymizedClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Aucun client anonymisé pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                anonymizedClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.clientNumber}</td>
                    <td className="py-3 px-4 font-bold">{c.workspace.name}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateFr(c.anonymizedAt)}</td>
                    <td className="py-3 px-4 text-slate-600 italic">{c.anonymizationReason || "Exercice droit RGPD"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                        Scellé 10 ans
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
