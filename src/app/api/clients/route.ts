import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction, ClientStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const query = searchParams.get("q") || "";
  const status = searchParams.get("status") as ClientStatus | null;

  if (!workspaceId) return NextResponse.json({ error: "workspaceId requis" }, { status: 400 });

  // FILTRE STRICT SERVEUR : workspaceId OBLIGATOIRE
  const whereClause: any = {
    workspaceId,
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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

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

    if (!workspaceId || !lastName || !email || !phone || !address || !postalCode || !city) {
      return NextResponse.json(
        { error: "Veuillez renseigner tous les champs obligatoires (Nom, Email, Téléphone, Adresse, CP, Ville)" },
        { status: 400 }
      );
    }

    // Récupérer le workspace pour le préfixe
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace introuvable" }, { status: 404 });

    const prefix = workspace.slug === "automobile" ? "CLI-AUTO" : "CLI-NET";
    const count = await prisma.client.count({ where: { workspaceId } });
    const year = new Date().getFullYear();
    const clientNumber = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    const client = await prisma.client.create({
      data: {
        workspaceId,
        clientNumber,
        isCompany: Boolean(isCompany),
        companyName: companyName || null,
        firstName: firstName || "",
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        country: country.trim(),
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
      workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
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
