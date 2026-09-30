"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, Lock, Mail, ArrowRight, Car, Server, UserCheck, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
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
                  placeholder="nom@jd-services.fr"
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
                    Se connecter <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Accès Démonstration Rapide */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
              Comptes Démo Préconfigurés (1-Clic)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@jd-services.fr")}
                className="flex items-center p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-slate-700 text-left"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600 mr-2 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold truncate">Super Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">Jean-Désiré (Tous)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("commercial.auto@jd-services.fr")}
                className="flex items-center p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-slate-700 text-left"
              >
                <Car className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold truncate">Auto Commercial</div>
                  <div className="text-[10px] text-slate-400 truncate">Marc Dubois</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("tech.network@jd-services.fr")}
                className="flex items-center p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-slate-700 text-left"
              >
                <Server className="w-4 h-4 text-cyan-600 mr-2 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold truncate">Tech Réseau</div>
                  <div className="text-[10px] text-slate-400 truncate">Thomas Leroy</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("comptable@jd-services.fr")}
                className="flex items-center p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-slate-700 text-left"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-semibold truncate">Comptable</div>
                  <div className="text-[10px] text-slate-400 truncate">Sophie Bernard</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Conforme aux normes françaises de facturation &amp; RGPD</p>
          <p className="mt-1">SASU JD-SERVICES • 60 rue de l&apos;égalité, 69800 Saint-Priest</p>
        </div>
      </div>
    </div>
  );
}
