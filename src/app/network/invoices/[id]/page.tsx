import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DocumentDetailViewClient from "@/components/documents/DocumentDetailViewClient";

export function generateStaticParams() {
  return [{ id: "preview" }];
}

export default async function NetworkInvoiceDetailPage({ params }: { params: { id: string } }) {
  const { workspace, user } = await requireWorkspace("network");

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
    return (
      <WorkspaceLayout workspace={workspace} user={user}>
        <div className="p-8 text-center text-slate-500">Document introuvable ou en cours de chargement.</div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <DocumentDetailViewClient
        workspace={workspace}
        user={user}
        document={doc}
        workspaceSlug="network"
      />
    </WorkspaceLayout>
  );
}
