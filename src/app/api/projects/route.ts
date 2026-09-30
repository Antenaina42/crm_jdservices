import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const clientId = searchParams.get("clientId");

  if (!workspaceId) return NextResponse.json({ error: "workspaceId requis" }, { status: 400 });

  const whereClause: any = { workspaceId };
  if (clientId) whereClause.clientId = clientId;

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      client: { select: { id: true, firstName: true, lastName: true, companyName: true, isCompany: true } },
      documents: { select: { id: true, documentNumber: true, documentType: true, totalTtc: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      workspaceId,
      clientId,
      title,
      type,
      status = "IN_PROGRESS",
      // Automobile
      vehicleMake,
      vehicleModel,
      vehicleVersion,
      vehicleYear,
      vehicleVin,
      vehiclePlate,
      vehicleMileage,
      vehicleFuel,
      vehicleGearbox,
      vehicleOriginCountry,
      vehicleAdLink,
      vehiclePurchasePrice,
      vehicleNotes,
      // Réseau
      networkWorkstationsCount,
      networkUsersCount,
      networkSitesCount,
      networkServers,
      networkFirewall,
      networkSwitches,
      networkWifi,
      networkVpn,
      networkVlan,
      networkBackup,
      networkPlanLevel,
      networkNotes,
      notes,
    } = body;

    if (!workspaceId || !clientId || !title) {
      return NextResponse.json({ error: "Workspace, client et titre sont obligatoires" }, { status: 400 });
    }

    const count = await prisma.project.count({ where: { workspaceId } });
    const year = new Date().getFullYear();
    const projectNumber = `PRJ-${year}-${String(count + 1).padStart(4, "0")}`;

    const project = await prisma.project.create({
      data: {
        workspaceId,
        clientId,
        projectNumber,
        title,
        type: type || "Standard",
        status,
        vehicleMake,
        vehicleModel,
        vehicleVersion,
        vehicleYear: vehicleYear ? Number(vehicleYear) : null,
        vehicleVin,
        vehiclePlate,
        vehicleMileage: vehicleMileage ? Number(vehicleMileage) : null,
        vehicleFuel,
        vehicleGearbox,
        vehicleOriginCountry,
        vehicleAdLink,
        vehiclePurchasePrice: vehiclePurchasePrice ? Number(vehiclePurchasePrice) : null,
        vehicleNotes,
        networkWorkstationsCount: networkWorkstationsCount ? Number(networkWorkstationsCount) : null,
        networkUsersCount: networkUsersCount ? Number(networkUsersCount) : null,
        networkSitesCount: networkSitesCount ? Number(networkSitesCount) : null,
        networkServers,
        networkFirewall,
        networkSwitches,
        networkWifi,
        networkVpn,
        networkVlan,
        networkBackup,
        networkPlanLevel,
        networkNotes,
        notes,
      },
      include: {
        client: true,
      },
    });

    await logAudit({
      workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: session.role,
      action: AuditAction.CREATED,
      entityType: "Project",
      entityId: project.id,
      entityReference: `${project.projectNumber} - ${project.title}`,
      newValue: { projectNumber: project.projectNumber, title: project.title },
    });

    return NextResponse.json({ success: true, project });
  } catch (error: any) {
    console.error("Erreur création projet :", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
