import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientDetailClient from "@/components/clients/ClientDetailClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export default async function AutomobileClientDetailPage({ params }: { params: { id: string } }) {
  const { workspace, user } = await requireWorkspace("automobile");

  // Isolation stricte : le client doit appartenir au workspace courant !
  const client = await prisma.client.findFirst({
    where: { id: params.id, workspaceId: workspace.id },
    include: {
      projects: { orderBy: { createdAt: "desc" } },
      documents: {
        include: {
          lines: true,
          signatureRequests: true,
        },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  if (!client) {
    return (
      <WorkspaceLayout workspace={workspace} user={user}>
        <div className="p-8 text-center text-slate-500">Client introuvable ou en cours de chargement.</div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <ClientDetailClient
        workspace={workspace}
        user={user}
        client={client}
        workspaceSlug="automobile"
      />
    </WorkspaceLayout>
  );
}
