import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Shield, FileText, Search, User, Clock, Terminal } from "lucide-react";
import { formatDateTimeFr } from "@/lib/utils";

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const whereClause: any = {};

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-10 px-4 sm:px-6 lg:px-12 w-full space-y-6">
      <div>
        <Link
          href="/workspace-select"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Retour
        </Link>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Journal d&apos;Audit Immuable (Audit Trail)
            </h1>
            <p className="text-xs text-slate-500">
              Registre inaltérable des actions, connexions, signatures et modifications légales
            </p>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-left font-mono">
                <th className="py-3 px-4">Date / Heure</th>
                <th className="py-3 px-4">Utilisateur / Rôle</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entité / Réf</th>
                <th className="py-3 px-4">Adresse IP</th>
                <th className="py-3 px-4">Détails Événement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Aucun événement d&apos;audit trouvé.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let parsedValue: any = null;
                  try {
                    parsedValue = log.newValueJson ? JSON.parse(log.newValueJson) : null;
                  } catch {}

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateTimeFr(log.timestamp)}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{log.userEmail}</span>
                        <div className="text-[10px] text-slate-400">{log.userRole || "SYSTÈME"}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === "CREATED"
                              ? "bg-blue-50 text-blue-700"
                              : log.action === "ISSUED"
                              ? "bg-slate-900 text-white"
                              : log.action === "SIGNED"
                              ? "bg-emerald-50 text-emerald-800"
                              : log.action === "PAID"
                              ? "bg-teal-50 text-teal-800"
                              : log.action === "CREDITED"
                              ? "bg-red-50 text-red-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 font-sans">
                          {log.entityReference || log.entityId.slice(0, 12)}
                        </span>
                        <div className="text-[10px] text-slate-400 font-sans">{log.entityType}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-500">{log.ipAddress || "127.0.0.1"}</td>

                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 font-sans">
                        {parsedValue?.action || parsedValue?.subject || log.newValueJson || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
