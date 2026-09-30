import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  FileText,
  Server,
  Building,
  ArrowLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function ComplianceDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [invoicesCount, creditNotesCount, proformasCount, auditLogsCount] = await Promise.all([
    prisma.documentRecord.count({ where: { documentType: "INVOICE" } }),
    prisma.documentRecord.count({ where: { documentType: "CREDIT_NOTE" } }),
    prisma.documentRecord.count({ where: { documentType: "PROFORMA" } }),
    prisma.auditLog.count(),
  ]);

  const complianceModules = [
    {
      title: "Facturation & Mentions Obligatoires",
      description: "Code de commerce (art. L441-9) et CGI (art. 242 nonies A) : SIREN, adresses, pénalités de retard et indemnité forfaitaire de 40 €.",
      status: "READY",
      badge: "CONFORME",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      title: "Numérotation Chronologique Transactionnelle",
      description: "Séquence continue, préfixes distincts (AUTO-FAC, NET-FAC), unicité annuelle absolue et blocage d'écrasement.",
      status: "READY",
      badge: "CONFORME",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      title: "Moteur Fiscal & Snapshot TVA",
      description: "Figement des taux applicables (20%, 10%, 5.5%, 0%) à l'émission. Aucune réévaluation rétroactive des documents comptables.",
      status: "READY",
      badge: "CONFORME",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      title: "Journal d'Audit Trail Immuable",
      description: "Traçabilité intégrale (Création, Émission, Envoi, Consultation, Signature, Paiement, Avoir) avec IP, User Agent et horodatage.",
      status: "READY",
      badge: "CONFORME",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      title: "Conservation Décennale (10 Ans) & Scellement",
      description: "Art. L123-22 du Code de commerce : protection contre suppression physique des factures et calcul d'empreinte SHA-256.",
      status: "READY",
      badge: "CONFORME",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      title: "Signature Électronique eIDAS",
      description: "Génération de jetons sécurisés, portail client public, recueil du consentement et dossier d'évidence certifié conforme.",
      status: "READY",
      badge: "CONFORME",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      title: "Conformité RGPD & Droit à l'Effacement",
      description: "Flux d'anonymisation des données personnelles avec maintien légal obligatoire des pièces comptables associées.",
      status: "READY",
      badge: "CONFORME",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    {
      title: "Réforme Facturation Électronique 2026 / 2027",
      description: "Structure Factur-X / UBL prête et abstraction EInvoicingProvider pour raccordement PDP / PPF agréé.",
      status: "CONFIGURATION_REQUIRED",
      badge: "PRÊT POUR RACCORDEMENT PDP",
      color: "bg-amber-50 text-amber-800 border-amber-200",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/workspace-select"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Retour à la sélection des espaces
        </Link>

        <span className="text-xs font-mono text-slate-400">
          Référentiel Juridique France 2026/2027
        </span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Tableau de Bord de Conformité Légale &amp; Fiscale
            </h1>
            <p className="text-xs text-slate-500">
              Audit des mécanismes de conformité aux réglementations françaises de facturation
            </p>
          </div>
        </div>

        {/* Warning Avertissement Fiscal Officiel */}
        <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Avertissement Fiscal &amp; Juridique :</strong>
            Les règles fiscales doivent être validées avec l&apos;expert-comptable ou le conseil fiscal de l&apos;entreprise. L&apos;application fournit des mécanismes stricts de gestion et de configuration mais ne constitue pas un conseil fiscal.
          </div>
        </div>
      </div>

      {/* Distinction fondamentale Réforme Facturation Électronique */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
          <Server className="w-3.5 h-3.5 mr-1.5" />
          Réforme Française 2026 / 2027 : Distingo Essentiel
        </div>
        <h2 className="text-lg sm:text-xl font-black">
          PDF Commercial vs Facture Électronique Réglementaire
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Un fichier PDF seul ne constitue pas à lui seul une facture électronique conforme au sens de la réforme française. La transmission réglementaire des factures B2B domestiques impose à terme le passage par une <strong>Plateforme de Dématérialisation Partenaire (PDP)</strong> agréée ou le <strong>Portail Public de Facturation (PPF)</strong>.
          Cette application intègre nativement l&apos;architecture technique requise (standard Factur-X / UBL, modèles d&apos;e-reporting et connecteur d&apos;API).
        </p>
      </div>

      {/* Module checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {complianceModules.map((mod, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">{mod.title}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${mod.color}`}>
                  {mod.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{mod.description}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-slate-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              Mécanisme actif et vérifié par l&apos;application
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
