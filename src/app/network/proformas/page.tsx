import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import DocumentListPage from "@/components/documents/DocumentListPage";
import { DocumentType } from "@prisma/client";

export default async function NetworkProformasPage() {
  const { workspace, user } = await requireWorkspace("network");

  const documents = await prisma.documentRecord.findMany({
    where: {
      workspaceId: workspace.id,
      documentType: DocumentType.PROFORMA,
    },
    include: {
      client: true,
      lines: true,
      signatureRequests: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <DocumentListPage
        workspace={workspace}
        user={user}
        initialDocuments={documents}
        documentType="PROFORMA"
        workspaceSlug="network"
      />
    </WorkspaceLayout>
  );
}
