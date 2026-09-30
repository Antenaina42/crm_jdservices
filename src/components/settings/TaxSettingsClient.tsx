"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Percent, Plus, ShieldCheck, ArrowLeft, Trash2, Edit2, X, Check } from "lucide-react";

interface TaxSettingsClientProps {
  initialTaxRates: any[];
  workspaces: any[];
}

export default function TaxSettingsClient({ initialTaxRates, workspaces }: TaxSettingsClientProps) {
  const [taxRates, setTaxRates] = useState(initialTaxRates);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRate, setEditingRate] = useState<any | null>(null);

  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || "");
  const [name, setName] = useState("");
  const [rate, setRate] = useState<number>(20);
  const [type, setType] = useState("STANDARD");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name, rate, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      const refreshed = await fetch("/api/tax").then((r) => r.json());
      setTaxRates(refreshed.taxRates);
      setShowAddModal(false);
      setName("");
      setRate(20);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRate.id,
          name: editingRate.name,
          rate: editingRate.rate,
          isActive: editingRate.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      const refreshed = await fetch("/api/tax").then((r) => r.json());
      setTaxRates(refreshed.taxRates);
      setEditingRate(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Confirmez-vous la suppression du taux "${name}" ?`)) return;
    try {
      const res = await fetch(`/api/tax?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setTaxRates(taxRates.filter((tr) => tr.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-12 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau Taux de TVA
        </button>
      </div>

      {/* RÈGLE CRITIQUE D'IMMUTABILITÉ FISCALE */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center text-emerald-400 font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          Principe d&apos;Immutabilité Historique (Snapshot TVA)
        </div>
        <p className="text-slate-300 leading-relaxed">
          Le taux de TVA appliqué à chaque facture est scellé dans le document au moment exact de son émission. Même si un taux est modifié ou supprimé ultérieurement, les anciennes factures conservent intacts leurs montants, taux et calculs d&apos;origine.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Taux de TVA Actifs par Espace ({taxRates.length})
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
                <th className="py-3 px-4 text-right">Actions (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxRates.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {tr.workspace?.slug === "automobile" ? "🚗 Automobile" : "🖥️ Réseau"}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">{tr.name}</td>
                  <td className="py-3 px-4 text-center font-black text-slate-900 text-sm">
                    {tr.rate}%
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-semibold">{tr.type}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tr.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {tr.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => setEditingRate(tr)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tr.id, tr.name)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION TAUX TVA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Nouveau Taux de TVA</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Espace de travail</label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Libellé (ex: TVA France 20%)</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taux (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Régime / Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="STANDARD">STANDARD</option>
                    <option value="INTERMEDIATE">INTERMÉDIAIRE (10%)</option>
                    <option value="REDUCED">RÉDUIT (5.5%)</option>
                    <option value="SUPER_REDUCED">SUPER RÉDUIT (2.1%)</option>
                    <option value="ZERO">EXONÉRÉ / EXPORT (0%)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? "Création..." : "Créer le taux"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION TAUX TVA */}
      {editingRate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Modifier le Taux</h3>
              <button onClick={() => setEditingRate(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Désignation</label>
                <input
                  type="text"
                  value={editingRate.name}
                  onChange={(e) => setEditingRate({ ...editingRate, name: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Taux (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRate.rate}
                    onChange={(e) => setEditingRate({ ...editingRate, rate: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editingRate.isActive ? "true" : "false"}
                    onChange={(e) => setEditingRate({ ...editingRate, isActive: e.target.value === "true" })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="true">Actif</option>
                    <option value="false">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-50"
                >
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
