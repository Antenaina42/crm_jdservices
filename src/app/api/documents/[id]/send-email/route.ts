import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEmailProvider, renderEmailTemplate } from "@/lib/providers/emailProvider";
import { logAudit } from "@/lib/audit";
import { formatCurrency } from "@/lib/utils";
import { AuditAction, DocumentStatus, EmailTemplateType } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const doc = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      workspace: true,
      signatureRequests: { where: { status: "PENDING" }, take: 1 },
    },
  });

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const recipientEmail = doc.client.email;
  const recipientName = doc.client.isCompany && doc.client.companyName
    ? doc.client.companyName
    : `${doc.client.firstName} ${doc.client.lastName}`.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const viewUrl = `${appUrl}/${doc.workspace.slug}/${doc.documentType === "PROFORMA" ? "proformas" : "invoices"}/${doc.id}`;
  const signToken = doc.signatureRequests[0]?.token;
  const signUrl = signToken ? `${appUrl}/client/signature/${signToken}` : undefined;

  const emailProvider = getEmailProvider();
  const templateType = doc.documentType === "PROFORMA" ? EmailTemplateType.PROFORMA_SENT : EmailTemplateType.INVOICE_SENT;

  const { subject, bodyHtml } = renderEmailTemplate(templateType, {
    clientName: recipientName,
    documentNumber: doc.documentNumber,
    totalTtc: formatCurrency(doc.totalTtc),
    viewUrl,
    signUrl,
    workspaceName: doc.workspace.name,
  });

  const sendResult = await emailProvider.sendEmail({
    workspaceId: doc.workspaceId,
    documentId: doc.id,
    templateType,
    recipientEmail,
    recipientName,
    subject,
    bodyHtml,
  });

  if (sendResult.success) {
    if (doc.status === DocumentStatus.DRAFT) {
      await prisma.documentRecord.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.SENT },
      });
    }

    await logAudit({
      workspaceId: doc.workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: AuditAction.SENT,
      entityType: "Document",
      entityId: doc.id,
      entityReference: doc.documentNumber,
      newValue: { recipient: recipientEmail, subject, provider: emailProvider.name },
    });

    return NextResponse.json({
      success: true,
      message: `Email transmis avec succès à ${recipientEmail}`,
    });
  } else {
    return NextResponse.json({ error: sendResult.error || "Échec de l'envoi de l'email" }, { status: 500 });
  }
}
