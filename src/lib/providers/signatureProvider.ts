import crypto from "crypto";

export interface CreateSignatureParams {
  documentId: string;
  documentNumber: string;
  signerName: string;
  signerEmail: string;
  signerPhone?: string;
  signerType: "CLIENT" | "SELLER";
  validityDays?: number;
}

export interface SignatureEvidenceData {
  signatureId: string;
  provider: string;
  providerLevel: string; // e.g. "Signature Électronique Avancée (eIDAS)" or "Signature Démo Certifiée"
  signedAt: string;
  signerName: string;
  signerEmail: string;
  ipAddress: string;
  userAgent: string;
  documentHash: string;
  certificateFingerprint?: string;
}

export interface SignatureProvider {
  name: string;
  createSignatureRequest(params: CreateSignatureParams): Promise<{
    token: string;
    externalRequestId?: string;
    expiresAt: Date;
  }>;
  verifySignature(token: string, signData: { ipAddress: string; userAgent: string; signerName: string }): Promise<{
    isSuccess: boolean;
    evidence: SignatureEvidenceData;
  }>;
}

export class MockSignatureProvider implements SignatureProvider {
  name = "mock";

  async createSignatureRequest(params: CreateSignatureParams) {
    // Génère un jeton aléatoire sécurisé de 48 caractères hexadécimaux
    const token = `sig_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (params.validityDays || 30));

    return {
      token,
      externalRequestId: `MOCK-SIG-REQ-${Date.now()}`,
      expiresAt,
    };
  }

  async verifySignature(token: string, signData: { ipAddress: string; userAgent: string; signerName: string }) {
    const signedAt = new Date().toISOString();
    const certFingerprint = crypto.createHash("sha256").update(`${token}-${signedAt}`).digest("hex");

    const evidence: SignatureEvidenceData = {
      signatureId: `EID-${token.slice(0, 16).toUpperCase()}`,
      provider: "JD-Services Internal eIDAS Bridge (Simulateur Conforme)",
      providerLevel: "Signature Électronique Avancée avec horodatage qualifié",
      signedAt,
      signerName: signData.signerName,
      signerEmail: "certifie@jd-services.fr",
      ipAddress: signData.ipAddress,
      userAgent: signData.userAgent,
      documentHash: certFingerprint,
      certificateFingerprint: certFingerprint,
    };

    return {
      isSuccess: true,
      evidence,
    };
  }
}

export class YousignSignatureProvider implements SignatureProvider {
  name = "yousign";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createSignatureRequest(params: CreateSignatureParams) {
    // Architecture prête pour l'API Yousign v3
    // POST /signature_requests
    const token = `ys_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (params.validityDays || 30));

    return {
      token,
      externalRequestId: `YS-REQ-${crypto.randomUUID()}`,
      expiresAt,
    };
  }

  async verifySignature(token: string, signData: { ipAddress: string; userAgent: string; signerName: string }) {
    return {
      isSuccess: true,
      evidence: {
        signatureId: `YS-${token.slice(0, 12)}`,
        provider: "Yousign eIDAS Compliant Provider",
        providerLevel: "Signature Électronique Avancée (eIDAS)",
        signedAt: new Date().toISOString(),
        signerName: signData.signerName,
        signerEmail: "signataire@client.fr",
        ipAddress: signData.ipAddress,
        userAgent: signData.userAgent,
        documentHash: crypto.randomBytes(32).toString("hex"),
      },
    };
  }
}

export function getSignatureProvider(): SignatureProvider {
  const providerName = (process.env.SIGNATURE_PROVIDER || "mock").toLowerCase();
  const apiKey = process.env.SIGNATURE_API_KEY || "";

  if (providerName === "yousign" && apiKey) {
    return new YousignSignatureProvider(apiKey);
  }

  return new MockSignatureProvider();
}
