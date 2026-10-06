"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@jd-services.fr");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Échec de la connexion");
      }

      router.push("/workspace-select");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillSuperAdmin = () => {
    setEmail("admin@jd-services.fr");
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Container */}
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xl mr-3">
            JD
          </div>
          <div className="text-left">
            <span className="text-lg font-black tracking-wider text-slate-900 block leading-tight">JD-SERVICES</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">Management Platform</span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Connexion Espace Sécurisé
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Gestion commerciale, facturation et conformité légale
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {/* Badge Super Admin */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Accès Super Admin</div>
                <div className="text-[11px] text-slate-500">Jean-Désiré Martialino (Tous les espaces)</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillSuperAdmin}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
            >
              Pré-remplir
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 mr-2.5 flex-shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Adresse Email Professionnelle
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jd-services.fr"
                  className="block w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => alert("Pour réinitialiser votre mot de passe, contactez l'administrateur système.")}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 shadow-sm transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Connexion en cours...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Se connecter en tant que Super Admin <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Conforme aux normes françaises de facturation &amp; RGPD</p>
          <p className="mt-1">SASU JD-SERVICES • 60 rue de l&apos;égalité, 69800 Saint-Priest</p>
        </div>
      </div>
    </div>
  );
}
