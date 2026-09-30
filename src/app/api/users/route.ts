import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { RoleEnum } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    include: {
      workspaceUsers: {
        include: { workspace: { select: { id: true, slug: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, password, firstName, lastName, role = "COMMERCIAL", workspaceSlugs = ["automobile"] } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json({ error: "Un utilisateur existe déjà avec cet email" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role as RoleEnum,
        isActive: true,
      },
    });

    // Assigner les workspaces
    if (workspaceSlugs && workspaceSlugs.length > 0) {
      const workspaces = await prisma.workspace.findMany({
        where: { slug: { in: workspaceSlugs } },
      });

      for (const ws of workspaces) {
        await prisma.workspaceUser.create({
          data: {
            workspaceId: ws.id,
            userId: user.id,
            role: role as RoleEnum,
          },
        });
      }
    }

    return NextResponse.json({ success: true, user });
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
    const { id, firstName, lastName, role, isActive } = body;
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        role: role !== undefined ? (role as RoleEnum) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({ success: true, user: updated });
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

  if (id === session.id) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte utilisateur" }, { status: 400 });
  }

  await prisma.workspaceUser.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Utilisateur supprimé" });
}
