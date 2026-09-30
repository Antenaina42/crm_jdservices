import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) return NextResponse.json({ error: "workspaceId requis" }, { status: 400 });

  const items = await prisma.serviceCatalogItem.findMany({
    where: { workspaceId },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { workspaceId, code, category, name, description, unit = "Forfait", defaultPriceHt, defaultTaxRate = 20.0, frequency = "PONCTUELLE" } = body;

  if (!workspaceId || !code || !name) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const item = await prisma.serviceCatalogItem.create({
    data: {
      workspaceId,
      code: code.trim(),
      category: category ? category.trim() : "GENERAL",
      name: name.trim(),
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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const { id, defaultPriceHt, name, description, isActive } = body;

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
