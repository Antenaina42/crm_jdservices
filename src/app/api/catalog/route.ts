import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardWorkspace, guardEntity } from "@/lib/apiGuard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  const g = await guardWorkspace(workspaceId, "read");
  if (!g.ok) return g.response;

  const items = await prisma.serviceCatalogItem.findMany({
    where: { workspaceId: g.access.workspaceId },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workspaceId, code, category, name, description, unit = "Forfait", defaultPriceHt, defaultTaxRate = 20.0, frequency = "PONCTUELLE" } = body;

  const g = await guardWorkspace(workspaceId, "write");
  if (!g.ok) return g.response;

  if (!code || !name) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const item = await prisma.serviceCatalogItem.create({
    data: {
      workspaceId: g.access.workspaceId,
      code: String(code).trim(),
      category: category ? String(category).trim() : "GENERAL",
      name: String(name).trim(),
      description: description || null,
      unit,
      defaultPriceHt: Number(defaultPriceHt) || 0,
      defaultTaxRate: Number(defaultTaxRate) || 20.0,
      frequency,
      isActive: true,
    },
  });

  return NextResponse.json({ success: true, item });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, defaultPriceHt, name, description, isActive } = body;

  const g = await guardEntity("catalogItem", id, "write");
  if (!g.ok) return g.response;

  const updated = await prisma.serviceCatalogItem.update({
    where: { id },
    data: {
      defaultPriceHt: defaultPriceHt !== undefined ? Number(defaultPriceHt) : undefined,
      name: name !== undefined ? name : undefined,
      description: description !== undefined ? description : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    },
  });

  return NextResponse.json({ success: true, item: updated });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const g = await guardEntity("catalogItem", id, "delete");
  if (!g.ok) return g.response;

  await prisma.serviceCatalogItem.delete({ where: { id: id! } });

  return NextResponse.json({ success: true, message: "Prestation supprimée du catalogue" });
}
