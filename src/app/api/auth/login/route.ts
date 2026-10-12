import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, SessionUser } from "@/lib/auth";
import { checkRateLimit, recordFailure, resetRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { AuditAction } from "@prisma/client";

// Hash factice pour comparaison en temps constant (atténuation des attaques temporelles)
const DUMMY_HASH = "$2a$10$e8wU.UqE8qN4uC5v3qA3tO2rI4a5s6d7f8g9h0j1k2l3m4n5o6p7q";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    // 1. Rate limiting par IP et par compte
    const emailLimit = checkRateLimit(`login:email:${normalizedEmail}`, 5, 15 * 60 * 1000);
    const ipLimit = checkRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const waitSeconds = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
      return NextResponse.json(
        {
          error: `Trop de tentatives infructueuses. Veuillez patienter ${waitSeconds} seconde(s) avant de réessayer.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(waitSeconds),
          },
        }
      );
    }

    // 2. Recherche utilisateur
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        workspaceUsers: {
          include: {
            workspace: {
              select: { id: true, slug: true, name: true },
            },
          },
        },
      },
    });

    // 3. Vérification du mot de passe (temps constant en cas de compte inexistant ou inactif)
    if (!user || !user.isActive) {
      await verifyPassword(String(password), DUMMY_HASH);
      recordFailure(`login:email:${normalizedEmail}`);
      recordFailure(`login:ip:${ip}`);
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    const isMatch = await verifyPassword(String(password), user.passwordHash);
    if (!isMatch) {
      recordFailure(`login:email:${normalizedEmail}`);
      recordFailure(`login:ip:${ip}`);
      return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
    }

    // 4. Succès : réinitialiser le compteur de tentatives
    resetRateLimit(`login:email:${normalizedEmail}`);
    resetRateLimit(`login:ip:${ip}`);

    // 5. Préparer la liste des espaces autorisés
    let userWorkspaces: Array<{ workspaceId: string; slug: string; name: string; role: any }> = [];

    if (user.role === "SUPER_ADMIN") {
      const allWorkspaces = await prisma.workspace.findMany({
        select: { id: true, slug: true, name: true },
      });
      userWorkspaces = allWorkspaces.map((w) => ({
        workspaceId: w.id,
        slug: w.slug,
        name: w.name,
        role: "SUPER_ADMIN",
      }));
    } else {
      userWorkspaces = user.workspaceUsers.map((wu) => ({
        workspaceId: wu.workspace.id,
        slug: wu.workspace.slug,
        name: wu.workspace.name,
        role: wu.role || user.role,
      }));
    }

    const sessionPayload: SessionUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      workspaces: userWorkspaces,
    };

    await setSessionCookie(sessionPayload);

    // 6. Audit Log de connexion réussie
    await logAudit({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: AuditAction.VIEWED,
      entityType: "User",
      entityId: user.id,
      entityReference: `Connexion ${user.email}`,
      newValue: { event: "Connexion réussie", ip },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Erreur de connexion :", error);
    return NextResponse.json({ error: "Une erreur est survenue lors de la connexion" }, { status: 500 });
  }
}
