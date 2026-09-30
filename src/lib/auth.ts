import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RoleEnum } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "jd-services-super-secret-key-32-chars-minimum-2026-mgmt"
);

const SESSION_COOKIE_NAME = "jd_session_token";

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleEnum;
  workspaces: Array<{
    workspaceId: string;
    slug: string;
    name: string;
    role: RoleEnum;
  }>;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ user: payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload as { user: SessionUser }).user || null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 jours
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function checkUserWorkspaceAccess(
  userId: string,
  workspaceSlug: string
): Promise<{ hasAccess: boolean; workspace: any; userRole: RoleEnum | null }> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    return { hasAccess: false, workspace: null, userRole: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      workspaceUsers: {
        where: { workspaceId: workspace.id },
      },
    },
  });

  if (!user || !user.isActive) {
    return { hasAccess: false, workspace, userRole: null };
  }

  // Le SUPER_ADMIN a accès total aux deux espaces
  if (user.role === RoleEnum.SUPER_ADMIN) {
    return { hasAccess: true, workspace, userRole: RoleEnum.SUPER_ADMIN };
  }

  // Vérification de l'association spécifique au workspace
  const workspaceUser = user.workspaceUsers[0];
  if (workspaceUser) {
    return {
      hasAccess: true,
      workspace,
      userRole: workspaceUser.role || user.role,
    };
  }

  return { hasAccess: false, workspace, userRole: null };
}
