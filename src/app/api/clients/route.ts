import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardWorkspace } from "@/lib/apiGuard";
import { logAudit } from "@/lib/audit";
import { AuditAction, ClientStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const query = searchParams.get("q") || "";
  const status = searchParams.get("status") as ClientStatus | null;

  const g = await guardWorkspace(workspaceId, "read");
  if (!g.ok) return g.response;

  // FILTRE STRICT SERVEUR : workspaceId OBLIGATOIRE
  const whereClause: any = {
    workspaceId: g.access.workspaceId,
  };

  if (status) {
    whereClause.status = status;
  }

  if (query.trim()) {
    whereClause.OR = [
      { firstName: { contains: query } },
      { lastName: { contains: query } },
      { companyName: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
      { clientNumber: { contains: query } },
      { siren: { contains: query } },
    ];
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    include: {
      projects: { select: { id: true, title: true, status: true, vehicleMake: true, vehicleModel: true } },
      documents: { select: { id: true, documentNumber: true, documentType: true, totalTtc: true, status: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      workspaceId,
      isCompany = false,
      companyName,
      firstName,
      lastName,
      email,
      phone,
      address,
      postalCode,
      city,
      country = "France",
      deliveryAddress,
      deliveryPostalCode,
      deliveryCity,
      deliveryCountry,
      siren,
      siret,
      vatNumber,
      notes,
    } = body;

    const g = await guardWorkspace(workspaceId, "write");
    if (!g.ok) return g.response;
    const { session, role } = g.access;

    if (!lastName || !email || !phone || !address || !postalCode || !city) {
      return NextResponse.json(
        { error: "Veuillez renseigner tous les champs obligatoires (Nom, Email, Téléphone, Adresse, CP, Ville)" },
        { status: 400 }
      );
    }

    // Récupérer le workspace pour le préfixe
    const workspace = await prisma.workspace.findUnique({
      where: { id: g.access.workspaceId },
      select: { slug: true },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace introuvable" }, { status: 404 });

    const prefix = workspace.slug === "automobile" ? "CLI-AUTO" : "CLI-NET";
    const count = await prisma.client.count({ where: { workspaceId: g.access.workspaceId } });
    const year = new Date().getFullYear();
    const clientNumber = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    const client = await prisma.client.create({
      data: {
        workspaceId: g.access.workspaceId,
        clientNumber,
        isCompany: Boolean(isCompany),
        companyName: companyName || null,
        firstName: firstName || "",
        lastName: String(lastName).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone).trim(),
        address: String(address).trim(),
        postalCode: String(postalCode).trim(),
        city: String(city).trim(),
        country: String(country).trim(),
        deliveryAddress: deliveryAddress || null,
        deliveryPostalCode: deliveryPostalCode || null,
        deliveryCity: deliveryCity || null,
        deliveryCountry: deliveryCountry || null,
        siren: siren || null,
        siret: siret || null,
        vatNumber: vatNumber || null,
        notes: notes || null,
        status: ClientStatus.ACTIVE,
      },
    });

    await logAudit({
      workspaceId: g.access.workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: role,
      action: AuditAction.CREATED,
      entityType: "Client",
      entityId: client.id,
      entityReference: `${client.clientNumber} - ${client.firstName} ${client.lastName}`,
      newValue: { clientNumber: client.clientNumber, email: client.email },
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("Erreur création client :", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
