import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DocumentDetailViewClient from "@/components/documents/DocumentDetailViewClient";

export default async function AutomobileInvoiceDetailPage({ params }: { params: { id: string } }) {
  const { workspace, user } = await requireWorkspace("automobile");

  const doc = await prisma.documentRecord.findFirst({
    where: {
      id: params.id,
      workspaceId: workspace.id,
    },
    include: {
      workspace: true,
      client: true,
      project: true,
      lines: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      creditNotes: true,
      originalInvoice: true,
    },
  });

  if (!doc) {
    notFound();
  }

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <DocumentDetailViewClient
        workspace={workspace}
        user={user}
        document={doc}
        workspaceSlug="automobile"
      />
    </WorkspaceLayout>
  );
}
