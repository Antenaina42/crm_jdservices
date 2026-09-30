"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Car,
  Server,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  FolderOpen,
  PenTool,
  History,
  Plus,
  ArrowLeft,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDateFr } from "@/lib/utils";

interface ClientDetailClientProps {
  workspace: any;
  user: any;
  client: any;
  workspaceSlug: "automobile" | "network";
}

export default function ClientDetailClient({
  workspace,
  user,
  client,
  workspaceSlug,
}: ClientDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "summary" | "projects" | "proformas" | "invoices" | "payments" | "documents" | "signatures" | "history"
  >("summary");

  const [showAnonymizeModal, setShowAnonymizeModal] = useState(false);
  const [anonymizeReason, setAnonymizeReason] = useState("");
  const [anonymizing, setAnonymizing] = useState(false);

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectType, setProjectType] = useState(workspaceSlug === "automobile" ? "Import" : "Audit");
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  // Auto specific project fields
  const [vehicleMake, setVehicleMake] = useState("BMW");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("2022");
  const [vehicleVin, setVehicleVin] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleMileage, setVehicleMileage] = useState("");
  const [vehicleOriginCountry, setVehicleOriginCountry] = useState("Allemagne");

  // Network specific project fields
  const [networkWorkstations, setNetworkWorkstations] = useState("20");
  const [networkFirewall, setNetworkFirewall] = useState("Fortinet 60F");
  const [networkPlan, setNetworkPlan] = useState("M2");

  const isAuto = workspaceSlug === "automobile";
  const displayName = client.isCompany && client.companyName
    ? client.companyName
    : `${client.firstName} ${client.lastName}`.trim();

  const proformas = client.documents?.filter((d: any) => d.documentType === "PROFORMA") || [];
  const invoices = client.documents?.filter((d: any) => d.documentType === "INVOICE" || d.documentType === "CREDIT_NOTE") || [];
  const totalBilled = client.documents?.reduce((acc: number, d: any) => acc + d.totalTtc, 0) || 0;
  const totalPaid = client.payments?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
  const balanceDue = Math.max(0, totalBilled - totalPaid);

  const handleAnonymize = async () => {
    setAnonymizing(true);
    try {
      const res = await fetch(`/api/clients/${client.id}/anonymize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: anonymizeReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      alert("Client anonymisé avec succès.");
      setShowAnonymizeModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAnonymizing(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjectSubmitting(true);
    try {
      const payload: any = {
        workspaceId: workspace.id,
        clientId: client.id,
        title: projectTitle,
        type: projectType,
      };

      if (isAuto) {
        payload.vehicleMake = vehicleMake;
        payload.vehicleModel = vehicleModel;
        payload.vehicleYear = Number(vehicleYear);
        payload.vehicleVin = vehicleVin;
        payload.vehiclePlate = vehiclePlate;
        payload.vehicleMileage = Number(vehicleMileage);
        payload.vehicleOriginCountry = vehicleOriginCountry;
      } else {
        payload.networkWorkstationsCount = Number(networkWorkstations);
        payload.networkFirewall = networkFirewall;
        payload.networkPlanLevel = networkPlan;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setShowNewProjectModal(false);
      router.refresh();
      setActiveTab("projects");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!confirm("Voulez-vous supprimer ce client ?")) return;
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur suppression");
      alert("Client supprimé.");
      router.push(`/${workspaceSlug}/clients`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Return link */}
      <div>
        <Link
          href={`/${workspaceSlug}/clients`}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Retour à la liste des clients
        </Link>
      </div>

      {/* Client Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
              client.isCompany ? "bg-amber-600" : isAuto ? "bg-slate-900" : "bg-cyan-700"
            }`}
          >
            {client.isCompany ? <Building className="w-7 h-7" /> : <User className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{displayName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {client.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                {client.clientNumber}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {client.email}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {client.phone}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {client.city}, {client.country}
              </span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${workspaceSlug}/proformas/new?clientId=${client.id}`}
            className={`inline-flex items-center px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition ${
              isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
            }`}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Créer Proforma
          </Link>

          <button
            type="button"
            onClick={() => setShowNewProjectModal(true)}
            className="inline-flex items-center px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nouveau Projet
          </button>

          <button
            type="button"
            onClick={() => setShowAnonymizeModal(true)}
            className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition"
            title="Demande d'anonymisation RGPD"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDeleteClient}
            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
            title="Supprimer client (bloqué si factures existantes)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Financial Quick Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase">Facturé Total</div>
          <div className="text-xl font-black text-slate-900 mt-1">{formatCurrency(totalBilled)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase">Encaissé</div>
          <div className="text-xl font-black text-teal-600 mt-1">{formatCurrency(totalPaid)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-slate-400 text-[11px] font-bold uppercase">Reste Dû</div>
          <div className="text-xl font-black text-amber-600 mt-1">{formatCurrency(balanceDue)}</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto text-xs font-bold">
          {[
            { id: "summary", label: "Résumé Fiche", icon: User },
            { id: "projects", label: `Projets (${client.projects?.length || 0})`, icon: isAuto ? Car : Server },
            { id: "proformas", label: `Proformas (${proformas.length})`, icon: FileSpreadsheet },
            { id: "invoices", label: `Factures (${invoices.length})`, icon: Receipt },
            { id: "payments", label: `Paiements (${client.payments?.length || 0})`, icon: CreditCard },
            { id: "documents", label: "Documents", icon: FolderOpen },
            { id: "signatures", label: "Signatures", icon: PenTool },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 flex items-center border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? isAuto
                      ? "border-blue-600 text-blue-700"
                      : "border-cyan-700 text-cyan-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB CONTENT 1 : SUMMARY */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Identité &amp; Coordonnées
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Raison Sociale :</span>
                <span className="font-bold text-slate-800">{client.companyName || "Particulier"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Nom &amp; Prénom :</span>
                <span className="font-bold text-slate-800">{client.firstName} {client.lastName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Email :</span>
                <span className="font-bold text-slate-800">{client.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Téléphone :</span>
                <span className="font-bold text-slate-800">{client.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Adresse de facturation :</span>
                <span className="font-bold text-slate-800 text-right">{client.address}, {client.postalCode} {client.city}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Pays :</span>
                <span className="font-bold text-slate-800">{client.country}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Mentions Légales &amp; Fiscales (B2B)
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">SIREN :</span>
                <span className="font-mono font-bold text-slate-800">{client.siren || "Non renseigné"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">SIRET :</span>
                <span className="font-mono font-bold text-slate-800">{client.siret || "Non renseigné"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">N° TVA Intracommunautaire :</span>
                <span className="font-mono font-bold text-slate-800">{client.vatNumber || "Non renseigné"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Adresse de livraison :</span>
                <span className="font-bold text-slate-800">{client.deliveryAddress || "Identique à facturation"}</span>
              </div>
              <div className="py-1.5">
                <span className="text-slate-400 block mb-1">Notes internes :</span>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 italic">
                  {client.notes || "Aucune note."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2 : PROJECTS */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              {isAuto ? "Projets Automobiles du Client" : "Infrastructures & Contrats Réseau"}
            </h3>
            <button
              type="button"
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nouveau Projet
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {client.projects && client.projects.length > 0 ? (
              client.projects.map((proj: any) => (
                <div key={proj.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-base">{proj.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          {proj.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{proj.projectNumber}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {proj.status}
                    </span>
                  </div>

                  {/* Automobile Project Specs */}
                  {isAuto && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Véhicule</span>
                        <strong className="text-slate-900">{proj.vehicleMake} {proj.vehicleModel}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Année / Km</span>
                        <strong className="text-slate-900">{proj.vehicleYear || "-"} • {proj.vehicleMileage ? `${proj.vehicleMileage} km` : "-"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Plaque / VIN</span>
                        <strong className="text-slate-900 font-mono text-[11px]">{proj.vehiclePlate || "WW en cours"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Origine</span>
                        <strong className="text-slate-900">{proj.vehicleOriginCountry || "Europe"}</strong>
                      </div>
                    </div>
                  )}

                  {/* Network Project Specs */}
                  {!isAuto && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-cyan-50/50 rounded-2xl text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Postes / Utilisateurs</span>
                        <strong className="text-slate-900">{proj.networkWorkstationsCount || 20} postes</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Pare-feu (Firewall)</span>
                        <strong className="text-slate-900">{proj.networkFirewall || "Fortinet"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Contrat IT</span>
                        <strong className="text-cyan-800 font-bold">{proj.networkPlanLevel || "M2 Professionnel"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Sites Distants</span>
                        <strong className="text-slate-900">{proj.networkSitesCount || 1} site(s)</strong>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
                Aucun projet enregistré pour ce client.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3 : PROFORMAS */}
      {activeTab === "proformas" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Proformas du Client</h3>
            <Link
              href={`/${workspaceSlug}/proformas/new?clientId=${client.id}`}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nouvelle Proforma
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-left">
                  <th className="py-2.5 px-4">Numéro</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Montant HT</th>
                  <th className="py-2.5 px-4 text-right">Montant TTC</th>
                  <th className="py-2.5 px-4 text-center">Statut</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proformas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Aucune proforma créée pour ce client.
                    </td>
                  </tr>
                ) : (
                  proformas.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <Link href={`/${workspaceSlug}/proformas/${p.id}`} className="hover:underline">
                          {p.documentNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDateFr(p.date)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrency(p.totalHt)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(p.totalTtc)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/${workspaceSlug}/proformas/${p.id}`}
                          className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold"
                        >
                          Visualiser
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4 : INVOICES */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Factures &amp; Avoirs Légaux</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-left">
                  <th className="py-2.5 px-4">Numéro</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-right">Total TTC</th>
                  <th className="py-2.5 px-4 text-right">Payé</th>
                  <th className="py-2.5 px-4 text-center">Statut</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Aucune facture émise pour ce client.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <Link href={`/${workspaceSlug}/invoices/${inv.id}`} className="hover:underline">
                          {inv.documentNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDateFr(inv.date)}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{inv.documentType}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(inv.totalTtc)}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-bold">{formatCurrency(inv.totalPaid)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800">
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/${workspaceSlug}/invoices/${inv.id}`}
                          className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold"
                        >
                          Visualiser
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5 : PAYMENTS */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Historique des Règlements Encaissés</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {client.payments && client.payments.length > 0 ? (
              client.payments.map((pay: any) => (
                <div key={pay.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      €
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{formatCurrency(pay.amount)}</div>
                      <div className="text-[11px] text-slate-400">
                        Règlement par {pay.paymentMethod} le {formatDateFr(pay.paymentDate)}
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    Réf : {pay.reference || "Virement"}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400">Aucun paiement enregistré pour l&apos;instant.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 7 : SIGNATURES */}
      {activeTab === "signatures" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Demandes de Signature Électronique</h3>
          <p className="text-xs text-slate-500">
            Suivi des invitations de signature et attestations d&apos;intégrité cryptographiques
          </p>

          <div className="space-y-3">
            {client.documents?.flatMap((d: any) => d.signatureRequests || []).length > 0 ? (
              client.documents
                .flatMap((d: any) => d.signatureRequests || [])
                .map((sig: any) => (
                  <div key={sig.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">
                        Signature pour document {sig.documentId}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Signataire : {sig.signerName} ({sig.signerEmail}) • Statut : <strong className="text-slate-800">{sig.status}</strong>
                      </div>
                    </div>
                    <Link
                      href={`/client/signature/${sig.token}`}
                      target="_blank"
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[11px]"
                    >
                      Lien public <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Aucune demande de signature active.
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Nouveau Projet — {isAuto ? "Import / Véhicule" : "Infrastructure Réseau"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Création d&apos;un dossier rattaché à {displayName}
            </p>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Titre du Projet *</label>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder={isAuto ? "Ex : Import BMW X5 Allemagne" : "Ex : Audit & Sécurisation Firewall"}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {isAuto ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Marque Véhicule</label>
                      <input
                        type="text"
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        placeholder="BMW, Audi, Porsche..."
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Modèle</label>
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="X5, A6, 911..."
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Année</label>
                      <input
                        type="number"
                        value={vehicleYear}
                        onChange={(e) => setVehicleYear(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Kilométrage</label>
                      <input
                        type="number"
                        value={vehicleMileage}
                        onChange={(e) => setVehicleMileage(e.target.value)}
                        placeholder="Ex : 45000"
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Origine</label>
                      <input
                        type="text"
                        value={vehicleOriginCountry}
                        onChange={(e) => setVehicleOriginCountry(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nombre de postes</label>
                      <input
                        type="number"
                        value={networkWorkstations}
                        onChange={(e) => setNetworkWorkstations(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Offre Contrat</label>
                      <select
                        value={networkPlan}
                        onChange={(e) => setNetworkPlan(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                      >
                        <option value="M1">M1 — Essentiel</option>
                        <option value="M2">M2 — Professionnel</option>
                        <option value="M3">M3 — Entreprise</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={projectSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold"
                >
                  {projectSubmitting ? "Création..." : "Enregistrer le projet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANONYMIZE MODAL */}
      {showAnonymizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center">
              <ShieldAlert className="w-5 h-5 mr-2 text-amber-600" />
              Demande d&apos;Anonymisation RGPD
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Conformément à l&apos;article 17 du RGPD (Droit à l&apos;effacement), les coordonnées personnelles seront purgées. Cependant, conformément aux articles L. 123-22 du Code de commerce et L. 102 B du LPF, l&apos;historique comptable et les factures seront scellés pendant 10 ans.
            </p>
            <textarea
              rows={3}
              value={anonymizeReason}
              onChange={(e) => setAnonymizeReason(e.target.value)}
              placeholder="Motif légal de la demande (ex: Exercice droit d'effacement)"
              className="w-full p-3 border border-slate-300 rounded-xl text-xs mb-4"
            ></textarea>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAnonymizeModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={anonymizing}
                onClick={handleAnonymize}
                className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition"
              >
                {anonymizing ? "Traitement..." : "Confirmer l'Anonymisation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
