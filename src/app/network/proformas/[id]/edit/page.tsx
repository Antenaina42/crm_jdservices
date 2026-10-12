import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ProformaBuilderClient from "@/components/documents/ProformaBuilderClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export default async function NetworkEditProformaPage({
  params,
}: {
  params: { id: string };
}) {
  const { workspace, user } = await requireWorkspace("network");

  const [document, clients, catalogItems] = await Promise.all([
    prisma.documentRecord.findUnique({
      where: { id: params.id, workspaceId: workspace.id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({
      where: { workspaceId: workspace.id },
      include: { projects: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.serviceCatalogItem.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      orderBy: { defaultPriceHt: "desc" },
    }),
  ]);

  if (!document) {
    return (
      <WorkspaceLayout workspace={workspace} user={user}>
        <div className="p-8 text-center text-slate-500">Document introuvable ou en cours de chargement.</div>
      </WorkspaceLayout>
    );
  }

  // Si le document est scellé / immuable, redirection vers la page de consultation
  if (document.isImmutable && process.env.NEXT_PHASE !== "phase-production-build") {
    redirect(`/network/proformas/${document.id}`);
  }

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <ProformaBuilderClient
        workspace={workspace}
        user={user}
        clients={clients}
        catalogItems={catalogItems}
        workspaceSlug="network"
        existingDocument={document}
      />
    </WorkspaceLayout>
  );
}
