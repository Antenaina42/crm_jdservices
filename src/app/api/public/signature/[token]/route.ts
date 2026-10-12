import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignatureProvider } from "@/lib/providers/signatureProvider";
import { logAudit } from "@/lib/audit";
import { AuditAction, DocumentStatus, SignatureStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;

    const sigReq = await prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        document: {
          include: {
            workspace: true,
            client: true,
            lines: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    if (!sigReq) {
      return NextResponse.json({ error: "Lien de signature invalide ou expiré" }, { status: 404 });
    }

    if (new Date() > sigReq.expiresAt) {
      return NextResponse.json({ error: "Ce lien de signature a expiré." }, { status: 410 });
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Navigateur Client";

    // Enregistrer l'événement d'ouverture et de consultation (Horodatage juridique)
    if (!sigReq.viewedAt) {
      await prisma.signatureRequest.update({
        where: { id: sigReq.id },
        data: {
          viewedAt: new Date(),
          status: sigReq.status === SignatureStatus.PENDING ? SignatureStatus.VIEWED : sigReq.status,
          events: {
            create: {
              eventType: "VIEWED",
              ipAddress: ip,
              userAgent,
              payloadJson: JSON.stringify({ action: "Document consulté par le signataire" }),
            },
          },
        },
      });

      // Audit Log
      await logAudit({
        workspaceId: sigReq.workspaceId,
        userEmail: sigReq.signerEmail,
        userRole: "CLIENT_SIGNATAIRE",
        action: AuditAction.VIEWED,
        entityType: "Document",
        entityId: sigReq.documentId,
        entityReference: sigReq.document.documentNumber,
        ipAddress: ip,
        userAgent,
        newValue: { action: "Ouverture du document par le client pour signature" },
      });
    }

    return NextResponse.json({
      signatureRequest: {
        id: sigReq.id,
        token: sigReq.token,
        status: sigReq.status,
        signerName: sigReq.signerName,
        signerEmail: sigReq.signerEmail,
        expiresAt: sigReq.expiresAt,
        signedAt: sigReq.signedAt,
        evidence: sigReq.evidenceJson ? JSON.parse(sigReq.evidenceJson) : null,
      },
      document: sigReq.document,
    });
  } catch (error: any) {
    console.error("Erreur consultation signature :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;
    const body = await req.json();
    const { action, signerName, comment, rejectionReason } = body;

    const sigReq = await prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        document: {
          include: {
            workspace: true,
            client: true,
          },
        },
      },
    });

    if (!sigReq) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (sigReq.status === SignatureStatus.SIGNED) {
      return NextResponse.json({ error: "Ce document a déjà été signé avec succès." }, { status: 400 });
    }

    if (new Date() > sigReq.expiresAt) {
      return NextResponse.json({ error: "Ce lien de signature a expiré." }, { status: 410 });
    }

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Navigateur Client";

    // CAS 1 : ACCEPTER ET SIGNER
    if (action === "ACCEPT_AND_SIGN") {
      const provider = getSignatureProvider();
      const verification = await provider.verifySignature(token, {
        ipAddress: ip,
        userAgent,
        signerName: signerName || sigReq.signerName,
      });

      const updatedSig = await prisma.signatureRequest.update({
        where: { id: sigReq.id },
        data: {
          status: SignatureStatus.SIGNED,
          signedAt: new Date(),
          signerName: signerName || sigReq.signerName,
          ipAddress: ip,
          userAgent,
          signedPdfHash: verification.evidence.documentHash,
          evidenceJson: JSON.stringify(verification.evidence),
          events: {
            create: {
              eventType: "SIGNED",
              ipAddress: ip,
              userAgent,
              payloadJson: JSON.stringify(verification.evidence),
            },
          },
        },
      });

      // Mettre à jour le statut du document
      await prisma.documentRecord.update({
        where: { id: sigReq.documentId },
        data: {
          status: DocumentStatus.ACCEPTED,
        },
      });

      // Enregistrer dans le journal d'audit immuable
      await logAudit({
        workspaceId: sigReq.workspaceId,
        userEmail: sigReq.signerEmail,
        userRole: "CLIENT_SIGNATAIRE",
        action: AuditAction.SIGNED,
        entityType: "Document",
        entityId: sigReq.documentId,
        entityReference: sigReq.document.documentNumber,
        ipAddress: ip,
        userAgent,
        newValue: {
          action: "Signature électronique validée et horodatée",
          evidence: verification.evidence,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Document signé avec succès !",
        evidence: verification.evidence,
      });
    }

    // CAS 2 : REFUSER
    if (action === "REJECT") {
      await prisma.signatureRequest.update({
        where: { id: sigReq.id },
        data: {
          status: SignatureStatus.REJECTED,
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || "Refusé par le client",
          events: {
            create: {
              eventType: "REJECTED",
              ipAddress: ip,
              userAgent,
              payloadJson: JSON.stringify({ reason: rejectionReason }),
            },
          },
        },
      });

      await prisma.documentRecord.update({
        where: { id: sigReq.documentId },
        data: { status: DocumentStatus.REJECTED },
      });

      await logAudit({
        workspaceId: sigReq.workspaceId,
        userEmail: sigReq.signerEmail,
        userRole: "CLIENT_SIGNATAIRE",
        action: AuditAction.REJECTED,
        entityType: "Document",
        entityId: sigReq.documentId,
        entityReference: sigReq.document.documentNumber,
        ipAddress: ip,
        userAgent,
        newValue: { action: "Document refusé", reason: rejectionReason },
      });

      return NextResponse.json({ success: true, message: "Le document a été refusé." });
    }

    // CAS 3 : DEMANDER MODIFICATION
    if (action === "REQUEST_MODIFICATION") {
      await prisma.signatureEvent.create({
        data: {
          signatureRequestId: sigReq.id,
          eventType: "MODIFICATION_REQUESTED",
          ipAddress: ip,
          userAgent,
          payloadJson: JSON.stringify({ comment }),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Votre demande de modification a été transmise à l'équipe JD-Services.",
      });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error: any) {
    console.error("Erreur exécution signature :", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
