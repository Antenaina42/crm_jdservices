import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import DocumentListPage from "@/components/documents/DocumentListPage";
import { DocumentType } from "@prisma/client";

export default async function NetworkInvoicesPage() {
  const { workspace, user } = await requireWorkspace("network");

  const documents = await prisma.documentRecord.findMany({
    where: {
      workspaceId: workspace.id,
      documentType: { in: [DocumentType.INVOICE, DocumentType.CREDIT_NOTE] },
    },
    include: {
      client: true,
      lines: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <DocumentListPage
        workspace={workspace}
        user={user}
        initialDocuments={documents}
        documentType="INVOICE"
        workspaceSlug="network"
      />
    </WorkspaceLayout>
  );
}
