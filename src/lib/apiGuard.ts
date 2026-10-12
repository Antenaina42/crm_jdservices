import { NextResponse } from "next/server";
import { RoleEnum } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, SessionUser } from "@/lib/auth";

/**
 * Garde d'autorisation CÔTÉ SERVEUR pour toutes les routes API.
 *
 * - Authentifie la session (cookie JWT).
 * - Revalide l'utilisateur EN BASE à chaque appel (compte actif, rôle et espaces à jour),
 *   donc un compte désactivé ou rétrogradé perd l'accès immédiatement (pas de jeton périmé).
 * - Vérifie l'appartenance à l'espace (workspace) concerné : isolation stricte Automobile / Réseau.
 * - Applique la matrice rôle → action.
 */

export type ApiAction = "read" | "write" | "delete" | "issue" | "pay";

/**
 * Matrice des permissions par rôle.
 * - read   : consulter
 * - write  : créer / modifier clients, projets, brouillons, catalogue, envoi e-mail, demande de signature
 * - delete : supprimer (brouillons / entités sans pièce comptable : les règles d'immuabilité restent appliquées par les routes)
 * - issue  : émettre / sceller, convertir une proforma en facture, créer un avoir
 * - pay    : enregistrer un règlement
 */
const PERMISSIONS: Record<RoleEnum, ApiAction[]> = {
  SUPER_ADMIN: ["read", "write", "delete", "issue", "pay"],
  ADMIN: ["read", "write", "delete", "issue", "pay"],
  COMMERCIAL: ["read", "write", "delete"],
  COMPTABLE: ["read", "issue", "pay"],
  LECTURE_SEULE: ["read"],
};

export interface ApiAccess {
  session: SessionUser;
  role: RoleEnum;
  workspaceId: string;
}

export type ApiGuardResult =
  | { ok: true; access: ApiAccess }
  | { ok: false; response: NextResponse };

function fail(status: number, error: string): ApiGuardResult {
  return { ok: false, response: NextResponse.json({ error }, { status }) };
}

export function roleCan(role: RoleEnum, action: ApiAction): boolean {
  return PERMISSIONS[role]?.includes(action) ?? false;
}

/**
 * Autorise une action sur un espace donné.
 * @param notFoundOnNoMembership renvoie 404 au lieu de 403 quand l'utilisateur n'appartient pas à l'espace
 *        (évite de révéler l'existence d'une entité d'un autre espace).
 */
export async function guardWorkspace(
  workspaceId: string | null | undefined,
  action: ApiAction,
  notFoundOnNoMembership = false
): Promise<ApiGuardResult> {
  const session = await getSession();
  if (!session) return fail(401, "Non autorisé");

  if (!workspaceId) return fail(400, "workspaceId requis");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { workspaceUsers: { where: { workspaceId } } },
  });

  if (!user || !user.isActive) return fail(401, "Non autorisé");

  let role: RoleEnum;
  if (user.role === RoleEnum.SUPER_ADMIN) {
    role = RoleEnum.SUPER_ADMIN;
  } else {
    const membership = user.workspaceUsers[0];
    if (!membership) {
      return notFoundOnNoMembership
        ? fail(404, "Ressource introuvable")
        : fail(403, "Accès refusé à cet espace de travail");
    }
    role = membership.role || user.role;
  }

  if (!roleCan(role, action)) {
    return fail(403, "Permission insuffisante pour cette action");
  }

  return { ok: true, access: { session, role, workspaceId } };
}

export type GuardedEntity = "client" | "project" | "document" | "catalogItem" | "taxRate";

/**
 * Charge l'espace propriétaire d'une entité puis applique guardWorkspace.
 * Ne divulgue pas l'existence d'entités d'un autre espace (404).
 */
export async function guardEntity(
  entity: GuardedEntity,
  id: string | null | undefined,
  action: ApiAction
): Promise<ApiGuardResult> {
  const session = await getSession();
  if (!session) return fail(401, "Non autorisé");
  if (!id) return fail(400, "Identifiant requis");

  let owner: { workspaceId: string } | null = null;
  switch (entity) {
    case "client":
      owner = await prisma.client.findUnique({ where: { id }, select: { workspaceId: true } });
      break;
    case "project":
      owner = await prisma.project.findUnique({ where: { id }, select: { workspaceId: true } });
      break;
    case "document":
      owner = await prisma.documentRecord.findUnique({ where: { id }, select: { workspaceId: true } });
      break;
    case "catalogItem":
      owner = await prisma.serviceCatalogItem.findUnique({ where: { id }, select: { workspaceId: true } });
      break;
    case "taxRate":
      owner = await prisma.taxRate.findUnique({ where: { id }, select: { workspaceId: true } });
      break;
  }

  if (!owner) return fail(404, "Ressource introuvable");

  return guardWorkspace(owner.workspaceId, action, true);
}

/**
 * Administration globale (gestion des utilisateurs) : SUPER_ADMIN ou ADMIN, compte actif en base.
 */
export async function guardAdmin(): Promise<ApiGuardResult> {
  const session = await getSession();
  if (!session) return fail(401, "Non autorisé");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) return fail(401, "Non autorisé");

  if (user.role !== RoleEnum.SUPER_ADMIN && user.role !== RoleEnum.ADMIN) {
    return fail(403, "Réservé aux administrateurs");
  }

  return {
    ok: true,
    access: { session: { ...session, role: user.role }, role: user.role, workspaceId: "" },
  };
}
