import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Building,
  Users,
  Percent,
  Hash,
  Mail,
  PenTool,
  Server,
  FolderOpen,
  Shield,
  ShieldCheck,
  History,
  Lock,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

export default async function SettingsIndexPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const settingsLinks = [
    {
      title: "Paramètres Entreprise & Coordonnées",
      desc: "Raison sociale, SIREN, SIRET, siège social, téléphone, mentions légales et coordonnées bancaires",
      href: "/settings/company",
      icon: Building,
    },
    {
      title: "Utilisateurs, Rôles & Espaces Autorisés",
      desc: "Gestion des accès SUPER_ADMIN, ADMIN, COMMERCIAL, COMPTABLE et assignation aux espaces Automobile / Réseau",
      href: "/settings/users",
      icon: Users,
    },
    {
      title: "Régimes & Taux de TVA Configurables",
      desc: "Configuration des taux 20%, 10%, 5.5%, 0% et règles de territorialité intracommunautaire / export",
      href: "/settings/tax",
      icon: Percent,
    },
    {
      title: "Journal d'Audit Immuable (Audit Trail)",
      desc: "Traçabilité intégrale, non modifiable, de toutes les actions, connexions et émissions de factures",
      href: "/settings/audit-log",
      icon: History,
    },
    {
      title: "Conformité Légale & Facturation Électronique",
      desc: "Tableau d'audit Code de commerce, TVA, conservation décennale et connecteur réforme 2026/2027",
      href: "/compliance",
      icon: ShieldCheck,
    },
    {
      title: "Gouvernance des Données & RGPD",
      desc: "Droit à l'effacement, demandes d'anonymisation et maintien de la conservation légale décennale",
      href: "/settings/rgpd",
      icon: Lock,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-12 w-full space-y-6">
      <div>
        <Link
          href="/workspace-select"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Retour
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Paramètres du Système</h1>
            <p className="text-xs text-slate-500">
              Configuration globale de la plateforme JD-Services Management
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsLinks.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs hover:border-slate-400 hover:shadow-md transition flex items-start space-x-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-700 flex items-center justify-center flex-shrink-0 transition">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                    {item.title}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
