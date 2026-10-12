import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdmin, guardWorkspace } from "@/lib/apiGuard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (workspaceId) {
    const g = await guardWorkspace(workspaceId, "read");
    if (!g.ok) return g.response;

    const taxRates = await prisma.taxRate.findMany({
      where: { workspaceId: g.access.workspaceId },
      include: { workspace: { select: { slug: true, name: true } } },
      orderBy: { rate: "desc" },
    });

    return NextResponse.json({ taxRates });
  }

  // Vue globale sans filtre : restreinte aux administrateurs
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const taxRates = await prisma.taxRate.findMany({
    include: { workspace: { select: { slug: true, name: true } } },
    orderBy: { rate: "desc" },
  });

  return NextResponse.json({ taxRates });
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const body = await req.json();
    const { workspaceId, name, rate, type = "STANDARD" } = body;

    if (!workspaceId || !name || rate === undefined) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) {
      return NextResponse.json({ error: "Espace introuvable" }, { status: 404 });
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        workspaceId,
        name: String(name).trim(),
        rate: Number(rate),
        type,
        country: "FR",
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, taxRate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  try {
    const body = await req.json();
    const { id, name, rate, isActive } = body;
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const existing = await prisma.taxRate.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Taux de TVA introuvable" }, { status: 404 });

    const updated = await prisma.taxRate.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        rate: rate !== undefined ? Number(rate) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, taxRate: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const existing = await prisma.taxRate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Taux de TVA introuvable" }, { status: 404 });

  await prisma.taxRate.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Taux de TVA supprimé" });
}
