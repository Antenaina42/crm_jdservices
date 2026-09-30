import { requireWorkspace } from "@/lib/workspace";
import WorkspaceLayout from "@/components/layout/WorkspaceLayout";
import { prisma } from "@/lib/prisma";
import FinancialDashboardClient from "@/components/financial/FinancialDashboardClient";
import { DocumentType } from "@prisma/client";

export default async function NetworkFinancialPage() {
  const { workspace, user } = await requireWorkspace("network");

  const [invoices, payments] = await Promise.all([
    prisma.documentRecord.findMany({
      where: {
        workspaceId: workspace.id,
        documentType: { in: [DocumentType.INVOICE, DocumentType.CREDIT_NOTE] },
      },
      include: { client: true },
      orderBy: { date: "desc" },
    }),
    prisma.payment.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { paymentDate: "desc" },
    }),
  ]);

  return (
    <WorkspaceLayout workspace={workspace} user={user}>
      <FinancialDashboardClient
        workspace={workspace}
        user={user}
        invoices={invoices}
        payments={payments}
        workspaceSlug="network"
      />
    </WorkspaceLayout>
  );
}
