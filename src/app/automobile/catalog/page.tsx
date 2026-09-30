import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import CatalogManagementClient from "@/components/catalog/CatalogManagementClient";

export default async function AutomobileCatalogPage() {
  const { workspace, user } = await requireWorkspace("automobile");

  const items = await prisma.serviceCatalogItem.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { defaultPriceHt: "desc" },
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <CatalogManagementClient
        workspace={workspace}
        user={user}
        initialItems={items}
        workspaceSlug="automobile"
      />
    </WorkspaceLayout>
  );
}
