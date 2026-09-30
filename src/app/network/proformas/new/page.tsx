import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import ProformaBuilderClient from "@/components/documents/ProformaBuilderClient";

export default async function NetworkNewProformaPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const { workspace, user } = await requireWorkspace("network");

  const [clients, catalogItems] = await Promise.all([
    prisma.client.findMany({
      where: { workspaceId: workspace.id },
      include: { projects: true },
      orderBy: { companyName: "asc" },
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
        workspaceSlug="network"
        preselectedClientId={searchParams.clientId}
      />
    </WorkspaceLayout>
  );
}
