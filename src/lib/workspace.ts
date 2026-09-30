import { getSession, checkUserWorkspaceAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { RoleEnum, Workspace } from "@prisma/client";

export interface WorkspaceContext {
  workspace: Workspace;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: RoleEnum;
  };
}

export async function requireWorkspace(slug: string): Promise<WorkspaceContext> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { hasAccess, workspace, userRole } = await checkUserWorkspaceAccess(session.id, slug);

  if (!hasAccess || !workspace) {
    // Rediriger vers l'écran de sélection si l'utilisateur n'a pas accès à cet espace spécifique
    redirect("/workspace-select");
  }

  return {
    workspace,
    user: {
      ...session,
      role: userRole || session.role,
    },
  };
}

/**
 * Filtre serveur strict : s'assure qu'une entité appartient bien au workspace donné.
 * Empêche toute fuite de données entre l'espace Automobile et Réseau.
 */
export async function assertEntityBelongsToWorkspace(
  entityType: "client" | "project" | "document",
  entityId: string,
  workspaceId: string
): Promise<boolean> {
  if (entityType === "client") {
    const client = await prisma.client.findFirst({
      where: { id: entityId, workspaceId },
      select: { id: true },
    });
    return !!client;
  }

  if (entityType === "project") {
    const project = await prisma.project.findFirst({
      where: { id: entityId, workspaceId },
      select: { id: true },
    });
    return !!project;
  }

  if (entityType === "document") {
    const doc = await prisma.documentRecord.findFirst({
      where: { id: entityId, workspaceId },
      select: { id: true },
    });
    return !!doc;
  }

  return false;
}
