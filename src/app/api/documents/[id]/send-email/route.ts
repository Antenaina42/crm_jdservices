import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardEntity } from "@/lib/apiGuard";
import { getEmailProvider, renderEmailTemplate } from "@/lib/providers/emailProvider";
import { logAudit } from "@/lib/audit";
import { formatCurrency } from "@/lib/utils";
import { AuditAction, DocumentStatus, EmailTemplateType } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guardEntity("document", params.id, "write");
  if (!g.ok) return g.response;
  const { session, role } = g.access;

  const doc = await prisma.documentRecord.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      workspace: true,
      signatureRequests: { where: { status: "PENDING" }, take: 1 },
    },
  });

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const recipientEmail = (body.recipientEmail && typeof body.recipientEmail === "string" && body.recipientEmail.includes("@"))
    ? body.recipientEmail.trim()
    : doc.client.email;

  const recipientName = doc.client.isCompany && doc.client.companyName
    ? doc.client.companyName
    : `${doc.client.firstName} ${doc.client.lastName}`.trim();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const viewUrl = `${appUrl}/${doc.workspace.slug}/${doc.documentType === "PROFORMA" ? "proformas" : "invoices"}/${doc.id}`;
  const signToken = doc.signatureRequests[0]?.token;
  const signUrl = signToken ? `${appUrl}/client/signature/${signToken}` : undefined;

  const emailProvider = getEmailProvider();
  const templateType = doc.documentType === "PROFORMA" ? EmailTemplateType.PROFORMA_SENT : EmailTemplateType.INVOICE_SENT;

  const rendered = renderEmailTemplate(templateType, {
    clientName: recipientName,
    documentNumber: doc.documentNumber,
    totalTtc: formatCurrency(doc.totalTtc),
    viewUrl,
    signUrl,
    workspaceName: doc.workspace.name,
  });

  const subject = (body.subject && typeof body.subject === "string" && body.subject.trim())
    ? body.subject.trim()
    : rendered.subject;

  let bodyHtml = rendered.bodyHtml;
  if (body.message && typeof body.message === "string" && body.message.trim()) {
    const formattedMsg = body.message
      .trim()
      .split("\n")
      .filter((line: string) => line.length > 0)
      .map((line: string) => `<p style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; line-height: 1.5;">${line}</p>`)
      .join("");

    bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 20px;">${doc.workspace.name}</h2>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Gestion commerciale &amp; facturation</p>
        </div>
        <p>Bonjour <strong>${recipientName}</strong>,</p>
        ${formattedMsg}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${viewUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block;">
            Consulter le document (${doc.documentNumber})
          </a>
        </div>
        ${
          signUrl
            ? `
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin-top: 24px;">
          <p style="margin: 0; font-size: 14px; color: #334155;">
            Vous pouvez également valider et signer ce document électroniquement en ligne :<br>
            <a href="${signUrl}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">Accéder à la signature en ligne &rarr;</a>
          </p>
        </div>`
            : ""
        }
        <div style="border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #9ca3af; text-align: center;">
          <p style="margin: 0;">Ce message vous a été adressé automatiquement par JD-Services Management.</p>
        </div>
      </div>
    `;
  }

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
