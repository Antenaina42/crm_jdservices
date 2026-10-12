import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardAdmin } from "@/lib/apiGuard";
import bcrypt from "bcryptjs";
import { RoleEnum } from "@prisma/client";

const VALID_ROLES = Object.values(RoleEnum);

export async function GET(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      workspaceUsers: {
        include: {
          workspace: { select: { id: true, slug: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const { session, role: callerRole } = g.access;

  try {
    const body = await req.json();
    const { email, password, firstName, lastName, role = "COMMERCIAL", workspaceSlugs = ["automobile"] } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 10) {
      return NextResponse.json(
        { error: "Le mot de passe doit comporter au moins 10 caractères." },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(role as RoleEnum)) {
      return NextResponse.json({ error: "Rôle non valide" }, { status: 400 });
    }

    // Protection hiérarchique : seul un SUPER_ADMIN peut créer un autre SUPER_ADMIN
    if (role === RoleEnum.SUPER_ADMIN && callerRole !== RoleEnum.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Seul un Super Administrateur peut créer un compte Super Admin." },
        { status: 403 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Un utilisateur existe déjà avec cet email" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        role: role as RoleEnum,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Assigner les workspaces
    if (workspaceSlugs && Array.isArray(workspaceSlugs) && workspaceSlugs.length > 0) {
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
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const { session, role: callerRole } = g.access;

  try {
    const body = await req.json();
    const { id, firstName, lastName, role, isActive } = body;
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Protection hiérarchique : seul un SUPER_ADMIN peut modifier un SUPER_ADMIN
    if (targetUser.role === RoleEnum.SUPER_ADMIN && callerRole !== RoleEnum.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Seul un Super Administrateur peut modifier un compte Super Admin." },
        { status: 403 }
      );
    }

    // Protection contre l'élévation de privilèges
    if (role && role === RoleEnum.SUPER_ADMIN && callerRole !== RoleEnum.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Seul un Super Administrateur peut attribuer le rôle Super Admin." },
        { status: 403 }
      );
    }

    if (role && !VALID_ROLES.includes(role as RoleEnum)) {
      return NextResponse.json({ error: "Rôle non valide" }, { status: 400 });
    }

    // Protection contre l'auto-désactivation ou l'auto-rétrogradation
    if (id === session.id) {
      if (isActive === false) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas désactiver votre propre compte administrateur." },
          { status: 400 }
        );
      }
      if (role && role !== targetUser.role) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas modifier votre propre rôle administrateur." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? String(firstName).trim() : undefined,
        lastName: lastName !== undefined ? String(lastName).trim() : undefined,
        role: role !== undefined ? (role as RoleEnum) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin();
  if (!g.ok) return g.response;
  const { session, role: callerRole } = g.access;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  if (id === session.id) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte utilisateur" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Protection hiérarchique : seul un SUPER_ADMIN peut supprimer un SUPER_ADMIN
  if (targetUser.role === RoleEnum.SUPER_ADMIN && callerRole !== RoleEnum.SUPER_ADMIN) {
    return NextResponse.json(
      { error: "Seul un Super Administrateur peut supprimer un compte Super Admin." },
      { status: 403 }
    );
  }

  await prisma.workspaceUser.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true, message: "Utilisateur supprimé" });
}
