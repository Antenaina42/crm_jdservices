import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const taxRates = await prisma.taxRate.findMany({
    include: { workspace: { select: { slug: true, name: true } } },
    orderBy: { rate: "desc" },
  });

  return NextResponse.json({ taxRates });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, name, rate, type = "STANDARD" } = body;

    if (!workspaceId || !name || rate === undefined) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        workspaceId,
        name: name.trim(),
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
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, rate, isActive } = body;
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const updated = await prisma.taxRate.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
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
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  await prisma.taxRate.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Taux de TVA supprimé" });
}
