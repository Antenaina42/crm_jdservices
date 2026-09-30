import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      projects: { orderBy: { createdAt: "desc" } },
      documents: {
        include: {
          lines: true,
          payments: true,
          signatureRequests: true,
        },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { paymentDate: "desc" } },
      anonymizationRequests: true,
    },
  });

  if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  return NextResponse.json({ client });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const client = await prisma.client.findUnique({ where: { id: params.id } });
  if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  const body = await req.json();

  const updatedClient = await prisma.client.update({
    where: { id: params.id },
    data: {
      isCompany: body.isCompany !== undefined ? Boolean(body.isCompany) : undefined,
      companyName: body.companyName !== undefined ? body.companyName : undefined,
      firstName: body.firstName !== undefined ? body.firstName : undefined,
      lastName: body.lastName !== undefined ? body.lastName : undefined,
      email: body.email !== undefined ? body.email.trim().toLowerCase() : undefined,
      phone: body.phone !== undefined ? body.phone.trim() : undefined,
      address: body.address !== undefined ? body.address.trim() : undefined,
      postalCode: body.postalCode !== undefined ? body.postalCode.trim() : undefined,
      city: body.city !== undefined ? body.city.trim() : undefined,
      country: body.country !== undefined ? body.country.trim() : undefined,
      deliveryAddress: body.deliveryAddress,
      deliveryPostalCode: body.deliveryPostalCode,
      deliveryCity: body.deliveryCity,
      deliveryCountry: body.deliveryCountry,
      siren: body.siren,
      siret: body.siret,
      vatNumber: body.vatNumber,
      status: body.status,
      notes: body.notes,
    },
  });

  await logAudit({
    workspaceId: client.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.UPDATED,
    entityType: "Client",
    entityId: client.id,
    entityReference: `${client.clientNumber} - ${client.firstName} ${client.lastName}`,
    oldValue: { email: client.email, phone: client.phone },
    newValue: { email: updatedClient.email, phone: updatedClient.phone },
  });

  return NextResponse.json({ success: true, client: updatedClient });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      documents: { select: { id: true, documentNumber: true, isImmutable: true } },
    },
  });

  if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  // RÈGLE CRITIQUE RGPD & FISCALE :
  // Si des documents comptables ou factures existent, la suppression physique est strictement interdite
  // afin de respecter l'obligation légale de conservation de 10 ans (Art. L123-22 Code de commerce).
  if (client.documents.length > 0) {
    return NextResponse.json(
      {
        error: "SUPPRESSION LÉGALE IMPOSSIBLE : Ce client est associé à des pièces comptables (factures, proformas). Conformément aux articles L. 123-22 du Code de commerce et L. 102 B du LPF, ces pièces doivent être conservées pendant une durée minimale de 10 ans. Vous pouvez utiliser la fonction 'Demande d'anonymisation RGPD' pour purger les données personnelles non comptables.",
      },
      { status: 403 }
    );
  }

  await prisma.client.delete({ where: { id: client.id } });

  await logAudit({
    workspaceId: client.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: session.role,
    action: AuditAction.DELETED,
    entityType: "Client",
    entityId: client.id,
    entityReference: client.clientNumber,
  });

  return NextResponse.json({ success: true, message: "Client supprimé avec succès." });
}
