import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Car, Server, ArrowRight, Shield, LogOut, CheckCircle2, ChevronRight, BarChart3 } from "lucide-react";
import Image from "next/image";

export default async function WorkspaceSelectPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const isSuperAdmin = session.role === "SUPER_ADMIN";
  const hasAutoAccess = isSuperAdmin || session.workspaces.some((w) => w.slug === "automobile");
  const hasNetAccess = isSuperAdmin || session.workspaces.some((w) => w.slug === "network");

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
              JD
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                JD-SERVICES MANAGEMENT
              </span>
              <span className="hidden sm:inline-block ml-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                Multi-Business Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">
                {session.firstName} {session.lastName}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {session.role} • {session.email}
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Selection Area */}
      <main className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Isolation Stricte des Données Clients &amp; Facturation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Que souhaitez-vous gérer ?
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto">
            Sélectionnez votre espace d&apos;activité indépendant. Vos données clients, proformas, factures et statistiques sont entièrement cloisonnées.
          </p>
        </div>

        {/* The Two Giant Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {/* CARTE 1 : IMPORT AUTOMOBILE */}
          <div
            className={`group relative bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden flex flex-col ${
              hasAutoAccess
                ? "border-slate-200/90 hover:border-blue-600 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                : "border-slate-200 opacity-60 cursor-not-allowed"
            }`}
          >
            {/* Top Identity Banner */}
            <div className="h-3 bg-gradient-to-r from-slate-900 via-blue-800 to-blue-600"></div>

            <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10 group-hover:bg-blue-600 transition-colors">
                    <Car className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 group-hover:bg-blue-50 group-hover:text-blue-700 transition">
                    Activité 1
                  </span>
                </div>

                <div className="mb-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                  JD-SERVICES
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
                  IMPORT AUTOMOBILE
                </h2>

                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Accompagnement à l&apos;importation européenne, vente sécurisée, rachat professionnel, inspections sur place et immatriculation provisoire WW.
                </p>

                {/* Features tags */}
                <div className="space-y-2 mb-8">
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Modèle Proforma Automobile (Réf. Morel Hortense)</span>
                  </div>
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Fiches Véhicules (VIN, Immatriculation, Kilométrage)</span>
                  </div>
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Catalogue Services : Check, Rapatriement, Plaques WW</span>
                  </div>
                </div>
              </div>

              <div>
                {hasAutoAccess ? (
                  <Link
                    href="/automobile/dashboard"
                    className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-blue-600 transition-all shadow-md group-hover:shadow-blue-500/20"
                  >
                    <span>Accéder à l&apos;Espace Automobile</span>
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <div className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-500 text-center text-xs font-semibold">
                    Accès restreint par l&apos;administrateur
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARTE 2 : ACCOMPAGNEMENT RÉSEAU */}
          <div
            className={`group relative bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden flex flex-col ${
              hasNetAccess
                ? "border-slate-200/90 hover:border-cyan-600 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                : "border-slate-200 opacity-60 cursor-not-allowed"
            }`}
          >
            {/* Top Identity Banner */}
            <div className="h-3 bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700"></div>

            <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-700 flex items-center justify-center text-white shadow-md shadow-cyan-700/10 group-hover:bg-cyan-600 transition-colors">
                    <Server className="w-8 h-8" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-50 text-cyan-800 group-hover:bg-cyan-100 transition">
                    Activité 2
                  </span>
                </div>

                <div className="mb-2 text-xs font-bold tracking-widest text-cyan-700 uppercase">
                  JD-SERVICES
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
                  ACCOMPAGNEMENT RÉSEAU
                </h2>

                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Administration réseau, infrastructure informatique B2B, sécurité firewall, segmentation VLAN, Wi-Fi 6 haute densité et contrats M1 / M2 / M3.
                </p>

                {/* Features tags */}
                <div className="space-y-2 mb-8">
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Modèle Proforma &amp; Facture IT Premium</span>
                  </div>
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Fiches Infra (Postes, Baies, Firewall, VLAN, VPN)</span>
                  </div>
                  <div className="flex items-center text-xs font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                    <span>Contrats récurrents : M1 Essentiel, M2 Pro, M3 Entreprise</span>
                  </div>
                </div>
              </div>

              <div>
                {hasNetAccess ? (
                  <Link
                    href="/network/dashboard"
                    className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-2xl bg-cyan-700 text-white font-bold text-sm hover:bg-cyan-600 transition-all shadow-md group-hover:shadow-cyan-600/20"
                  >
                    <span>Accéder à l&apos;Espace Réseau</span>
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                ) : (
                  <div className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-500 text-center text-xs font-semibold">
                    Accès restreint par l&apos;administrateur
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Super Admin Consolidated Overview Link */}
        {isSuperAdmin && (
          <div className="mt-12 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Vue Consolidée Multi-Activités (Super Admin)
                </h3>
                <p className="text-xs text-slate-500">
                  Consulter les chiffres d&apos;affaires consolidés tout en conservant la stricte séparation des deux métiers.
                </p>
              </div>
            </div>
            <Link
              href="/admin/consolidated"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
            >
              Voir la synthèse consolidée <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-200/60 text-center text-xs text-slate-500">
        JD-SERVICES MANAGEMENT • SASU au capital de 1 000 € • SIRET : 130419377 • 60 rue de l&apos;égalité, 69800 Saint-Priest
      </footer>
    </div>
  );
}
