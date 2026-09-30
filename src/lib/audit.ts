import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { AuditAction } from "@prisma/client";

export interface LogAuditParams {
  workspaceId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  entityType: "Document" | "Client" | "Project" | "User" | "TaxRate" | "Setting";
  entityId: string;
  entityReference?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Enregistrement immutable dans le journal d'audit (Audit Trail)
 */
export async function logAudit(params: LogAuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId || null,
        userId: params.userId || null,
        userEmail: params.userEmail || "Système",
        userRole: params.userRole || "SYSTÈME",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityReference: params.entityReference || null,
        oldValueJson: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValueJson: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress || "127.0.0.1",
        userAgent: params.userAgent || "JD-Services Internal Engine",
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'audit log :", error);
    // L'audit ne doit pas bloquer silencieusement, mais loguer l'erreur
    return null;
  }
}

/**
 * Calcule l'empreinte cryptographique SHA-256 canonique d'un document émis.
 * Cette empreinte garantit qu'aucune modification ultérieure n'a pu altérer les données financières.
 */
export function computeDocumentHash(data: {
  documentNumber: string;
  documentType: string;
  date: string | Date;
  sellerSiren: string;
  clientIdentifier: string;
  totalHt: number;
  totalTax: number;
  totalTtc: number;
  lines: Array<{ designation: string; quantity: number; unitPriceHt: number; taxRate: number }>;
}): string {
  const canonicalString = [
    data.documentNumber,
    data.documentType,
    typeof data.date === "string" ? data.date : data.date.toISOString(),
    data.sellerSiren,
    data.clientIdentifier,
    data.totalHt.toFixed(2),
    data.totalTax.toFixed(2),
    data.totalTtc.toFixed(2),
    JSON.stringify(data.lines.map((l) => [l.designation.trim(), l.quantity, l.unitPriceHt.toFixed(2), l.taxRate.toFixed(1)])),
  ].join("|");

  return crypto.createHash("sha256").update(canonicalString, "utf8").digest("hex");
}
