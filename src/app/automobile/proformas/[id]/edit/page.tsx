import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ProformaBuilderClient from "@/components/documents/ProformaBuilderClient";

export default async function AutomobileEditProformaPage({
  params,
}: {
  params: { id: string };
}) {
  const { workspace, user } = await requireWorkspace("automobile");

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

  if (!document) notFound();

  // Si le document est scellé / immuable, redirection vers la page de consultation
  if (document.isImmutable) {
    redirect(`/automobile/proformas/${document.id}`);
  }

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <ProformaBuilderClient
        workspace={workspace}
        user={user}
        clients={clients}
        catalogItems={catalogItems}
        workspaceSlug="automobile"
        existingDocument={document}
      />
    </WorkspaceLayout>
  );
}
