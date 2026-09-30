"use client";

import React, { useState } from "react";
import { Plus, Edit2, Check, X, Layers, Car, Server, Trash2, Power } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CatalogManagementClientProps {
  workspace: any;
  user: any;
  initialItems: any[];
  workspaceSlug: "automobile" | "network";
}

export default function CatalogManagementClient({
  workspace,
  user,
  initialItems,
  workspaceSlug,
}: CatalogManagementClientProps) {
  const [items, setItems] = useState(initialItems);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // New item state
  const [code, setCode] = useState("");
  const [category, setCategory] = useState(workspaceSlug === "automobile" ? "CHECK" : "AUDIT");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("Forfait");
  const [priceHt, setPriceHt] = useState(100);
  const [frequency, setFrequency] = useState("PONCTUELLE");

  const isAuto = workspaceSlug === "automobile";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          code,
          category,
          name,
          description,
          unit,
          defaultPriceHt: priceHt,
          frequency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur création");

      setItems([...items, data.item]);
      setShowAddModal(false);
      setCode("");
      setName("");
      setDescription("");
      setPriceHt(100);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch("/api/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          name: editingItem.name,
          description: editingItem.description,
          defaultPriceHt: editingItem.defaultPriceHt,
          isActive: editingItem.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur mise à jour");

      setItems(items.map((it) => (it.id === editingItem.id ? { ...it, ...editingItem } : it)));
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (!confirm(`Confirmez-vous la suppression de la prestation "${itemName}" du catalogue ?`)) return;
    try {
      const res = await fetch(`/api/catalog?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setItems(items.filter((it) => it.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (item: any) => {
    try {
      const newStatus = !item.isActive;
      const res = await fetch("/api/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setItems(items.map((it) => (it.id === item.id ? { ...it, isActive: newStatus } : it)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const categories = Array.from(new Set(items.map((it) => it.category)));

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Catalogue de Prestations — {isAuto ? "Import Automobile" : "Réseau & Contrats"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Les tarifs sont entièrement configurables (CRUD complet) et modifiables sans altérer l&apos;historique comptable des anciennes factures.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className={`inline-flex items-center px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition ${
            isAuto ? "bg-blue-600 hover:bg-blue-700" : "bg-cyan-700 hover:bg-cyan-800"
          }`}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Ajouter une Prestation
        </button>
      </div>

      {/* Categories & Catalog Grid */}
      <div className="space-y-8">
        {categories.map((cat) => {
          const catItems = items.filter((it) => it.category === cat);
          return (
            <div key={cat} className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 bg-slate-200/70 px-2.5 py-0.5 rounded-md">
                  {cat}
                </span>
                <span className="text-xs text-slate-400 font-semibold">({catItems.length} prestation{catItems.length > 1 ? "s" : ""})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl p-5 border transition flex flex-col justify-between ${
                      item.isActive
                        ? "border-slate-200/80 shadow-2xs hover:shadow-xs"
                        : "border-slate-200 bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.code}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                            {item.name}
                          </h3>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          Prix HT ({item.unit})
                        </div>
                        <div className="text-lg font-black text-slate-900">
                          {formatCurrency(item.defaultPriceHt)}
                        </div>
                      </div>

                      {/* Actions CRUD */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            item.isActive
                              ? "text-emerald-700 hover:bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-200"
                          }`}
                          title={item.isActive ? "Désactiver la prestation" : "Activer la prestation"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Modifier la prestation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer du catalogue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL AJOUT PRESTATION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Ajouter une Prestation</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code référence</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: CHK-01 ou M1-ESS"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: INSPECTION, RAPATRIEMENT, M1..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Désignation du service</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Diagnostic valise + vérification kilométrage"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description détaillée (facultative)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix HT (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={priceHt}
                    onChange={(e) => setPriceHt(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unité</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="Forfait">Forfait</option>
                    <option value="Unité">Unité</option>
                    <option value="Jours">Jours</option>
                    <option value="Heures">Heures</option>
                    <option value="Mois">Mois</option>
                    <option value="Km">Km</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Périodicité</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="PONCTUELLE">Ponctuelle</option>
                    <option value="MENSUELLE">Mensuelle</option>
                    <option value="ANNUELLE">Annuelle</option>
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
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION PRESTATION */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Modifier : {editingItem.code}</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Désignation du service</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix HT (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingItem.defaultPriceHt}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, defaultPriceHt: Number(e.target.value) })
                    }
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statut</label>
                  <select
                    value={editingItem.isActive ? "true" : "false"}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, isActive: e.target.value === "true" })
                    }
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
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
