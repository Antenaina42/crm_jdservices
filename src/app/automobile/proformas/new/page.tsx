import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import ProformaBuilderClient from "@/components/documents/ProformaBuilderClient";

export default async function AutomobileNewProformaPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const { workspace, user } = await requireWorkspace("automobile");

  const [clients, catalogItems] = await Promise.all([
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

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <ProformaBuilderClient
        workspace={workspace}
        user={user}
        clients={clients}
        catalogItems={catalogItems}
        workspaceSlug="automobile"
        preselectedClientId={searchParams.clientId}
      />
    </WorkspaceLayout>
  );
}
