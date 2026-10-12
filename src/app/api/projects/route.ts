import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardWorkspace, guardEntity } from "@/lib/apiGuard";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  const clientId = searchParams.get("clientId");

  const g = await guardWorkspace(workspaceId, "read");
  if (!g.ok) return g.response;

  const whereClause: any = { workspaceId: g.access.workspaceId };
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

    const g = await guardWorkspace(workspaceId, "write");
    if (!g.ok) return g.response;
    const { session, role } = g.access;

    if (!clientId || !title) {
      return NextResponse.json({ error: "Client et titre sont obligatoires" }, { status: 400 });
    }

    // Vérifier que le client appartient bien à ce workspace
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId: g.access.workspaceId },
    });
    if (!client) {
      return NextResponse.json({ error: "Client introuvable dans cet espace" }, { status: 404 });
    }

    const count = await prisma.project.count({ where: { workspaceId: g.access.workspaceId } });
    const year = new Date().getFullYear();
    const projectNumber = `PRJ-${year}-${String(count + 1).padStart(4, "0")}`;

    const project = await prisma.project.create({
      data: {
        workspaceId: g.access.workspaceId,
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
      workspaceId: g.access.workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: role,
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

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, status, notes } = body;
    if (!id) return NextResponse.json({ error: "ID du projet requis" }, { status: 400 });

    const g = await guardEntity("project", id, "write");
    if (!g.ok) return g.response;
    const { session, role } = g.access;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    await logAudit({
      workspaceId: existing.workspaceId,
      userId: session.id,
      userEmail: session.email,
      userRole: role,
      action: AuditAction.UPDATED,
      entityType: "Project",
      entityId: existing.id,
      entityReference: `${existing.projectNumber} - ${existing.title}`,
      oldValue: { status: existing.status, title: existing.title },
      newValue: { status: updated.status, title: updated.title },
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const g = await guardEntity("project", id, "delete");
  if (!g.ok) return g.response;
  const { session, role } = g.access;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { documents: { select: { id: true, documentNumber: true } } },
  });

  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  if (project.documents.length > 0) {
    return NextResponse.json(
      { error: "Impossible de supprimer ce projet car des documents ou factures lui sont rattachés." },
      { status: 400 }
    );
  }

  await prisma.project.delete({ where: { id } });

  await logAudit({
    workspaceId: project.workspaceId,
    userId: session.id,
    userEmail: session.email,
    userRole: role,
    action: AuditAction.DELETED,
    entityType: "Project",
    entityId: project.id,
    entityReference: `${project.projectNumber} - ${project.title}`,
  });

  return NextResponse.json({ success: true, message: "Projet supprimé" });
}
