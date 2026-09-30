import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction, ClientStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Seul un SUPER_ADMIN ou ADMIN peut valider l'anonymisation RGPD
  if (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Droits insuffisants. Seul un administrateur peut valider une anonymisation RGPD." },
      { status: 403 }
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: params.id },
  });

  if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  const body = await req.json();
  const { reason = "Demande d'exercice du droit à l'effacement RGPD (Art. 17 RGPD)" } = body;

  const anonymizedClient = await prisma.client.update({
    where: { id: params.id },
    data: {
      firstName: "Client",
      lastName: "Anonymisé",
      companyName: client.isCompany ? "Société Anonymisée (RGPD)" : null,
      email: `anonymized_${client.id}@rgpd.local`,
      phone: "0000000000",
      address: "Adresse effacée (RGPD)",
      notes: `Données personnelles purgées le ${new Date().toLocaleDateString("fr-FR")}. Motif : ${reason}`,
      status: ClientStatus.ARCHIVED,
      anonymizedAt: new Date(),
      anonymizationReason: reason,
    },
  });

  await logAudit({
    workspaceId: client.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.ANONYMIZED,
    entityType: "Client",
    entityId: client.id,
    entityReference: client.clientNumber,
    newValue: {
      action: "Anonymisation RGPD effectuée",
      reason,
      preservationNotice: "Les pièces comptables associées demeurent scellées pour conservation légale décennale.",
    },
  });

  return NextResponse.json({
    success: true,
    message: "Données personnelles du client anonymisées conformément au RGPD.",
    client: anonymizedClient,
  });
}
