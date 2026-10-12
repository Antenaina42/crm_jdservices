"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClientRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.token) {
      router.replace(`/client/signature/${params.token}`);
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-sm font-semibold text-slate-600">Redirection vers le portail de signature sécurisé...</div>
    </div>
  );
}
