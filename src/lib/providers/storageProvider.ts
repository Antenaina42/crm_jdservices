import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface SaveFileParams {
  workspaceId: string;
  clientId?: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

export interface StorageProvider {
  name: string;
  saveFile(params: SaveFileParams): Promise<{
    filePath: string;
    fileSize: number;
    hashSha256: string;
  }>;
  readFile(filePath: string): Promise<Buffer>;
}

export class LocalStorageProvider implements StorageProvider {
  name = "local";
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "storage");
  }

  async saveFile(params: SaveFileParams) {
    const hash = crypto.createHash("sha256").update(params.buffer).digest("hex");
    const targetDir = path.join(
      this.baseDir,
      "workspaces",
      params.workspaceId,
      params.clientId || "general"
    );

    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, params.filename);
    await fs.writeFile(targetPath, params.buffer);

    return {
      filePath: targetPath,
      fileSize: params.buffer.length,
      hashSha256: hash,
    };
  }

  async readFile(filePath: string) {
    return await fs.readFile(filePath);
  }
}

export function getStorageProvider(): StorageProvider {
  return new LocalStorageProvider();
}
