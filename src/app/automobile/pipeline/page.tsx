import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import CrmKanbanClient from "@/components/crm/CrmKanbanClient";

export default async function AutomobilePipelinePage() {
  const { workspace, user } = await requireWorkspace("automobile");

  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    include: {
      projects: true,
      documents: {
        include: { signatureRequests: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <CrmKanbanClient
        workspace={workspace}
        user={user}
        clients={clients}
        workspaceSlug="automobile"
      />
    </WorkspaceLayout>
  );
}
