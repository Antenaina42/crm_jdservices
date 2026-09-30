"use client";

import React, { useState } from "react";
import { Plus, Edit2, Check, X, Layers, Car, Server } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);

  // New item state
  const [code, setCode] = useState("");
  const [category, setCategory] = useState(workspaceSlug === "automobile" ? "CHECK" : "AUDIT");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("Forfait");
  const [priceHt, setPriceHt] = useState(100);
  const [frequency, setFrequency] = useState("PONCTUELLE");

  const isAuto = workspaceSlug === "automobile";

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditPrice(item.defaultPriceHt);
  };

  const handleSavePrice = async (id: string) => {
    try {
      const res = await fetch("/api/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, defaultPriceHt: editPrice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setItems(items.map((it) => (it.id === id ? { ...it, defaultPriceHt: editPrice } : it)));
      setEditingId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

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
      if (!res.ok) throw new Error(data.error || "Erreur");

      setItems([...items, data.item]);
      setShowAddModal(false);
      setCode("");
      setName("");
      setDescription("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Catalogue de Prestations — {isAuto ? "Import Automobile" : "Réseau & Contrats"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Les tarifs sont entièrement configurables et peuvent être modifiés à tout moment sans altérer l&apos;historique comptable des anciennes factures.
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

      {/* Services Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Prestation &amp; Description</th>
                <th className="py-3 px-4 text-center">Unité</th>
                <th className="py-3 px-4 text-right">Prix HT Configurable</th>
                <th className="py-3 px-4 text-center">TVA</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    {item.code}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    {item.description && (
                      <div className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-600">{item.unit}</td>
                  <td className="py-3.5 px-4 text-right">
                    {editingId === item.id ? (
                      <div className="flex items-center justify-end space-x-1">
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-24 p-1 border border-blue-500 rounded text-right font-black text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePrice(item.id)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-black text-slate-900 text-sm">
                        {formatCurrency(item.defaultPriceHt)}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-600">{item.defaultTaxRate}%</td>
                  <td className="py-3.5 px-4 text-right">
                    {editingId !== item.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Modifier Prix
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Ajouter une Prestation au Catalogue
            </h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code Service *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={isAuto ? "AUTO-CHK-02" : "NET-M4"}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex : CHECK, AUDIT, M1..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nom de la prestation *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Intitulé officiel sur les proformas..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description technique</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Détails des prestations incluses..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unité</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Forfait, Unité, Mois..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prix par défaut HT (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={priceHt}
                    onChange={(e) => setPriceHt(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold"
                >
                  Ajouter au catalogue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
