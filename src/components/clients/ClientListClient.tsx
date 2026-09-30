"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Car,
  Server,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Filter,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ClientListClientProps {
  workspace: any;
  user: any;
  initialClients: any[];
  workspaceSlug: "automobile" | "network";
}

export default function ClientListClient({
  workspace,
  user,
  initialClients,
  workspaceSlug,
}: ClientListClientProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "INDIVIDUAL" | "COMPANY">("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAuto = workspaceSlug === "automobile";

  // Form states for new client
  const [isCompany, setIsCompany] = useState(!isAuto);
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("France");
  const [siren, setSiren] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.firstName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastName.toLowerCase().includes(search.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(search.toLowerCase())) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.clientNumber.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === "COMPANY") return c.isCompany;
    if (filterType === "INDIVIDUAL") return !c.isCompany;
    return true;
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          isCompany,
          companyName: isCompany ? companyName : null,
          firstName,
          lastName,
          email,
          phone,
          address,
          postalCode,
          city,
          country,
          siren: isCompany ? siren : null,
          siret: isCompany ? siret : null,
          vatNumber: isCompany ? vatNumber : null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");

      setShowCreateModal(false);
      router.refresh();
      router.push(`/${workspaceSlug}/clients/${data.client.id}`);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {isAuto ? "Clients & Dossiers Automobiles" : "Clients Entreprises Réseau"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
              {clients.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fichier client strictement isolé dans l&apos;espace {workspace.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className={`inline-flex items-center px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition ${
            isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
          }`}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {isAuto ? "Nouveau Client Auto" : "Nouveau Client B2B"}
        </button>
      </div>

      {/* Filters and search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, n° client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tous ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("INDIVIDUAL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === "INDIVIDUAL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Particuliers
          </button>
          <button
            type="button"
            onClick={() => setFilterType("COMPANY")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterType === "COMPANY" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Entreprises
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Client / Société</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Projets Actifs</th>
                <th className="py-3 px-4">Coordonnées</th>
                <th className="py-3 px-4 text-right">Pièces / Total</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Aucun client ne correspond à votre recherche dans cet espace.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const displayName = client.isCompany && client.companyName
                    ? client.companyName
                    : `${client.firstName} ${client.lastName}`.trim();

                  const totalSpent = client.documents?.reduce((acc: number, d: any) => acc + d.totalTtc, 0) || 0;

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/${workspaceSlug}/clients/${client.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 transition block text-sm"
                        >
                          {displayName}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {client.clientNumber}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {client.isCompany ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Building className="w-3 h-3 mr-1" />
                            Entreprise
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            <User className="w-3 h-3 mr-1" />
                            Particulier
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {client.projects && client.projects.length > 0 ? (
                          <div className="space-y-0.5">
                            {client.projects.map((p: any) => (
                              <div key={p.id} className="font-semibold text-slate-800 text-[11px] truncate max-w-xs">
                                • {p.title}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Aucun projet</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center space-x-1 truncate max-w-xs">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-0.5 text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-slate-900">{formatCurrency(totalSpent)}</div>
                        <div className="text-[10px] text-slate-400">
                          {client.documents?.length || 0} document(s)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {client.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/${workspaceSlug}/clients/${client.id}`}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                        >
                          Fiche <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CLIENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Créer un Nouveau Client — {isAuto ? "Automobile" : "Réseau"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Les données seront enregistrées exclusivement dans {workspace.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="flex items-center space-x-4 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsCompany(false)}
                  className={`flex-1 py-2 rounded-lg font-bold transition ${
                    !isCompany ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Particulier
                </button>
                <button
                  type="button"
                  onClick={() => setIsCompany(true)}
                  className={`flex-1 py-2 rounded-lg font-bold transition ${
                    isCompany ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Entreprise / Professionnel
                </button>
              </div>

              {isCompany && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Raison Sociale / Société *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex : SAS Auto Direct ou SARL Réseau Pro"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom de famille"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@domaine.fr"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse de facturation *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Numéro et voie"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code Postal *</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="69000"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Ville *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ville"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {isCompany && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SIREN</label>
                    <input
                      type="text"
                      value={siren}
                      onChange={(e) => setSiren(e.target.value)}
                      placeholder="9 chiffres"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SIRET</label>
                    <input
                      type="text"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                      placeholder="14 chiffres"
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">N° TVA Intra</label>
                    <input
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      placeholder="FR..."
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations sur le projet, véhicule ou infrastructure..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                ></textarea>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-sm transition disabled:opacity-50 ${
                    isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
                  }`}
                >
                  {loading ? "Création..." : "Enregistrer le client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
