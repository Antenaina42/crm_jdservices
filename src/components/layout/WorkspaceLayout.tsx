"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Layers,
  FolderOpen,
  PieChart,
  Settings,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  ArrowLeftRight,
  Car,
  Server,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";

interface WorkspaceLayoutProps {
  workspace: {
    id: string;
    slug: string;
    name: string;
    activityType: "AUTOMOBILE" | "NETWORK";
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  children: React.ReactNode;
}

export default function WorkspaceLayout({ workspace, user, children }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isAuto = workspace.slug === "automobile";
  const basePath = `/${workspace.slug}`;

  const navItems = [
    { label: "Tableau de bord", href: `${basePath}/dashboard`, icon: LayoutDashboard },
    { label: "Clients & Fiches", href: `${basePath}/clients`, icon: Users },
    { label: "Pipeline CRM", href: `${basePath}/pipeline`, icon: Kanban },
    { label: "Factures Proformas", href: `${basePath}/proformas`, icon: FileSpreadsheet },
    { label: "Factures Légales", href: `${basePath}/invoices`, icon: Receipt },
    { label: "Suivi Paiements", href: `${basePath}/payments`, icon: CreditCard },
    {
      label: isAuto ? "Catalogue Auto" : "Catalogue & Contrats",
      href: `${basePath}/catalog`,
      icon: Layers,
    },
    { label: "Gestion Documentaire", href: `${basePath}/documents`, icon: FolderOpen },
    { label: "Synthèse Financière", href: `${basePath}/financial`, icon: PieChart },
    { label: "Conformité Facturation", href: `/compliance`, icon: ShieldCheck },
    { label: "Paramètres", href: `/settings`, icon: Settings },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`${basePath}/clients?q=${encodeURIComponent(searchQuery)}`);
  };

  const themeClasses = isAuto
    ? {
        accent: "bg-blue-600 hover:bg-blue-700 text-white",
        activeNav: "bg-blue-50 text-blue-700 font-bold border-r-4 border-blue-600",
        badge: "bg-slate-900 text-white",
        headerRing: "focus:ring-blue-500",
      }
    : {
        accent: "bg-cyan-700 hover:bg-cyan-800 text-white",
        activeNav: "bg-cyan-50 text-cyan-800 font-bold border-r-4 border-cyan-600",
        badge: "bg-cyan-800 text-white",
        headerRing: "focus:ring-cyan-500",
      };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col md:flex-row">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col bg-white border-r border-slate-200/80 sticky top-0 h-screen z-20">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
                isAuto ? "bg-slate-900" : "bg-cyan-700"
              }`}
            >
              {isAuto ? <Car className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>
            <div>
              <span className="font-black text-slate-900 tracking-tight text-sm block leading-tight">
                JD-SERVICES
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isAuto ? "text-blue-600" : "text-cyan-700"
                }`}
              >
                {isAuto ? "Import Automobile" : "Accompagnement Réseau"}
              </span>
            </div>
          </div>
        </div>

        {/* Switch Workspace Quick Pill */}
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100">
          <Link
            href="/workspace-select"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-2xs transition"
          >
            <div className="flex items-center space-x-2 truncate">
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">Changer d&apos;espace</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {isAuto ? "AUTO" : "RÉSEAU"}
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
                  isActive
                    ? themeClasses.activeNav
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? "" : "text-slate-400"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card Bottom */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono truncate">{user.role}</div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-slate-900">JD-SERVICES</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-xl text-sm ${
                      isActive ? themeClasses.activeNav : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <Link
                href="/workspace-select"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-2 px-3 rounded-xl bg-slate-100 text-xs font-bold text-slate-800"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 mr-2" />
                Changer d&apos;espace
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-10 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-slate-500">
              <span>JD-SERVICES</span>
              <span>/</span>
              <span className={isAuto ? "text-blue-600 font-bold" : "text-cyan-700 font-bold"}>
                {workspace.name}
              </span>
            </div>
          </div>

          {/* Search Box - Scoped to Current Workspace */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Rechercher client, projet, document dans ${isAuto ? "Automobile" : "Réseau"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 ${themeClasses.headerRing} transition`}
              />
            </div>
          </form>

          {/* Top Actions */}
          <div className="flex items-center space-x-3">
            <Link
              href="/compliance"
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
              title="Conformité Légale Facturation"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Conformité Légale</span>
              <span className="sm:hidden">Légal</span>
            </Link>

            <Link
              href="/workspace-select"
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Changer d&apos;espace</span>
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
