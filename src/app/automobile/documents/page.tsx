import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import DocumentStorageManagerClient from "@/components/documents/DocumentStorageManagerClient";

export default async function AutomobileDocumentsPage() {
  const { workspace, user } = await requireWorkspace("automobile");

  const documents = await prisma.documentRecord.findMany({
    where: { workspaceId: workspace.id },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <DocumentStorageManagerClient
        workspace={workspace}
        user={user}
        documents={documents}
        workspaceSlug="automobile"
      />
    </WorkspaceLayout>
  );
}
