import crypto from "node:crypto";

export function hashSha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
