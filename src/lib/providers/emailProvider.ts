import { prisma } from "@/lib/prisma";
import { EmailTemplateType } from "@prisma/client";

export interface SendEmailParams {
  workspaceId: string;
  documentId?: string;
  templateType: EmailTemplateType;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
}

export interface EmailProvider {
  name: string;
  sendEmail(params: SendEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export class MockEmailProvider implements EmailProvider {
  name = "mock";

  async sendEmail(params: SendEmailParams) {
    const messageId = `msg_mock_${Date.now()}`;

    // Enregistrement systématique dans la base pour traçabilité
    await prisma.emailMessage.create({
      data: {
        workspaceId: params.workspaceId,
        documentId: params.documentId || null,
        templateType: params.templateType,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        subject: params.subject,
        bodyHtml: params.bodyHtml,
        status: "DELIVERED",
        provider: "mock",
        providerMessageId: messageId,
      },
    });

    return {
      success: true,
      messageId,
    };
  }
}

export class ResendEmailProvider implements EmailProvider {
  name = "resend";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(params: SendEmailParams) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${process.env.EMAIL_FROM_NAME || "JD-SERVICES"} <${process.env.EMAIL_FROM || "contact@jd-services.fr"}>`,
          to: [params.recipientEmail],
          subject: params.subject,
          html: params.bodyHtml,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur Resend");
      }

      await prisma.emailMessage.create({
        data: {
          workspaceId: params.workspaceId,
          documentId: params.documentId || null,
          templateType: params.templateType,
          recipientEmail: params.recipientEmail,
          recipientName: params.recipientName,
          subject: params.subject,
          bodyHtml: params.bodyHtml,
          status: "SENT",
          provider: "resend",
          providerMessageId: data.id,
        },
      });

      return { success: true, messageId: data.id };
    } catch (err: any) {
      await prisma.emailMessage.create({
        data: {
          workspaceId: params.workspaceId,
          documentId: params.documentId || null,
          templateType: params.templateType,
          recipientEmail: params.recipientEmail,
          recipientName: params.recipientName,
          subject: params.subject,
          bodyHtml: params.bodyHtml,
          status: "FAILED",
          provider: "resend",
          errorMessage: err.message,
        },
      });

      return { success: false, error: err.message };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  const providerName = (process.env.EMAIL_PROVIDER || "mock").toLowerCase();
  const apiKey = process.env.EMAIL_API_KEY || "";

  if (providerName === "resend" && apiKey) {
    return new ResendEmailProvider(apiKey);
  }

  return new MockEmailProvider();
}

/**
 * Générateur de modèles HTML d'e-mails professionnels JD-Services
 */
export function renderEmailTemplate(
  template: EmailTemplateType,
  data: {
    clientName: string;
    documentNumber: string;
    totalTtc: string;
    viewUrl: string;
    signUrl?: string;
    workspaceName: string;
    senderName?: string;
  }
): { subject: string; bodyHtml: string } {
  switch (template) {
    case EmailTemplateType.PROFORMA_SENT:
    case EmailTemplateType.PROFORMA_CREATED:
      return {
        subject: `Votre facture proforma ${data.documentNumber} — ${data.workspaceName}`,
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #0f172a; font-size: 20px;">${data.workspaceName}</h2>
              <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Gestion commerciale & facturation</p>
            </div>
            <p>Bonjour <strong>${data.clientName}</strong>,</p>
            <p>Veuillez trouver ci-joint votre <strong>Facture Proforma n° ${data.documentNumber}</strong> d'un montant total de <strong>${data.totalTtc}</strong>.</p>
            <p>Ce document récapitule les prestations convenues et les conditions de règlement.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.viewUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block;">
                Consulter le document
              </a>
            </div>
            ${
              data.signUrl
                ? `
            <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin-top: 24px;">
              <p style="margin: 0; font-size: 14px; color: #334155;">
                Vous pouvez également valider et signer ce document électroniquement en ligne :<br>
                <a href="${data.signUrl}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">Accéder à la signature en ligne &rarr;</a>
              </p>
            </div>
            `
                : ""
            }
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
            <p style="font-size: 12px; color: #6b7280; line-height: 1.5;">
              JD-SERVICES SASU — 60 rue de l'égalité, 69800 Saint-Priest, France.<br>
              Pour toute question, contactez notre équipe au 06.25.98.67.23 ou par email à contact@jd-services.fr.
            </p>
          </div>
        `,
      };

    case EmailTemplateType.SIGNATURE_REQUEST:
      return {
        subject: `Demande de signature électronique : Document ${data.documentNumber}`,
        bodyHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
              <h2 style="margin: 0; color: #0f172a; font-size: 20px;">${data.workspaceName}</h2>
              <span style="display: inline-block; background: #e0f2fe; color: #0284c7; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 6px;">
                Signature Électronique Sécurisée
              </span>
            </div>
            <p>Bonjour <strong>${data.clientName}</strong>,</p>
            <p>Votre document <strong>${data.documentNumber}</strong> d'un montant de <strong>${data.totalTtc}</strong> est prêt pour votre signature électronique.</p>
            <p>La signature s'effectue en quelques secondes depuis votre ordinateur, tablette ou smartphone via notre portail sécurisé.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.signUrl}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                Consulter et Signer le document &rarr;
              </a>
            </div>
            <p style="font-size: 13px; color: #64748b;">
              Ce lien est personnel et confidentiel. Une copie d'évidence certifiée conforme sera automatiquement générée dès signature.
            </p>
          </div>
        `,
      };

    default:
      return {
        subject: `Document ${data.documentNumber} — ${data.workspaceName}`,
        bodyHtml: `<p>Bonjour ${data.clientName}, votre document ${data.documentNumber} est disponible.</p>`,
      };
  }
}
