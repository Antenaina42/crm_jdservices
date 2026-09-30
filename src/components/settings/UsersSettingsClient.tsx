"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Users, Plus, Shield, ArrowLeft, Trash2, Edit2, CheckCircle2, Lock, X } from "lucide-react";

interface UsersSettingsClientProps {
  initialUsers: any[];
  currentUserId: string;
}

export default function UsersSettingsClient({ initialUsers, currentUserId }: UsersSettingsClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // New user form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("COMMERCIAL");
  const [autoAccess, setAutoAccess] = useState(true);
  const [netAccess, setNetAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const workspaceSlugs: string[] = [];
      if (autoAccess) workspaceSlugs.push("automobile");
      if (netAccess) workspaceSlugs.push("network");

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName, role, workspaceSlugs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      // Reload list
      const updatedList = await fetch("/api/users").then((r) => r.json());
      setUsers(updatedList.users);
      setShowAddModal(false);
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          role: editingUser.role,
          isActive: editingUser.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      const updatedList = await fetch("/api/users").then((r) => r.json());
      setUsers(updatedList.users);
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Confirmez-vous la suppression définitive du compte de ${name} ?`)) return;
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setUsers(users.filter((u) => u.id !== id));
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
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Gestion des Utilisateurs &amp; Permissions
              </h1>
              <p className="text-xs text-slate-500">
                Rôles (SUPER_ADMIN, ADMIN, COMMERCIAL, COMPTABLE, LECTURE_SEULE) et espaces autorisés
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
          Nouvel Utilisateur
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Utilisateurs Enregistrés ({users.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left">
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Rôle Système</th>
                <th className="py-3 px-4">Espaces Autorisés</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4 text-right">Actions (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSuper = u.role === "SUPER_ADMIN";
                const spaces = isSuper
                  ? ["🚗 Automobile", "🖥️ Réseau"]
                  : u.workspaceUsers?.map((wu: any) =>
                      wu.workspace.slug === "automobile" ? "🚗 Automobile" : "🖥️ Réseau"
                    ) || [];

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.firstName} {u.lastName}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-[10px] text-blue-600 font-normal">(Vous)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === "SUPER_ADMIN"
                            ? "bg-slate-900 text-white"
                            : u.role === "COMPTABLE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {spaces.map((s: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {u.isActive ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id, `${u.firstName} ${u.lastName}`)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉATION UTILISATEUR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Ajouter un Utilisateur</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email professionnel</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rôle Système</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="COMMERCIAL">COMMERCIAL (Accès clients &amp; proformas de son espace)</option>
                  <option value="COMPTABLE">COMPTABLE (Factures, avoirs, TVA, export)</option>
                  <option value="ADMIN">ADMIN (Gestion de l&apos;espace assigné)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Accès total multi-workspaces)</option>
                  <option value="LECTURE_SEULE">LECTURE_SEULE (Consultation)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Espaces de travail autorisés</label>
                <div className="flex items-center space-x-4 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAccess}
                      onChange={(e) => setAutoAccess(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>🚗 Import Automobile</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={netAccess}
                      onChange={(e) => setNetAccess(e.target.checked)}
                      className="rounded text-cyan-700"
                    />
                    <span>🖥️ Accompagnement Réseau</span>
                  </label>
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
                  {submitting ? "Création..." : "Créer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION UTILISATEUR */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Modifier : {editingUser.firstName} {editingUser.lastName}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rôle Système</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="COMMERCIAL">COMMERCIAL</option>
                  <option value="COMPTABLE">COMPTABLE</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="LECTURE_SEULE">LECTURE_SEULE</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Statut du Compte</label>
                <select
                  value={editingUser.isActive ? "true" : "false"}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.value === "true" })}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="true">Actif (Accès autorisé)</option>
                  <option value="false">Inactif (Bloqué)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
