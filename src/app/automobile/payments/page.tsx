import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import PaymentsTrackerClient from "@/components/payments/PaymentsTrackerClient";
import { DocumentType, DocumentStatus } from "@prisma/client";

export default async function AutomobilePaymentsPage() {
  const { workspace, user } = await requireWorkspace("automobile");

  const [payments, unpaidInvoices] = await Promise.all([
    prisma.payment.findMany({
      where: { workspaceId: workspace.id },
      include: {
        client: true,
        document: true,
      },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.documentRecord.findMany({
      where: {
        workspaceId: workspace.id,
        documentType: DocumentType.INVOICE,
        status: { in: [DocumentStatus.ISSUED, DocumentStatus.SENT, DocumentStatus.PARTIALLY_PAID] },
        balanceDue: { gt: 0 },
      },
      include: { client: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <PaymentsTrackerClient
        workspace={workspace}
        user={user}
        payments={payments}
        unpaidInvoices={unpaidInvoices}
        workspaceSlug="automobile"
      />
    </WorkspaceLayout>
  );
}
