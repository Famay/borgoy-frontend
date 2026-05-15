export async function calculateSha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = Array.from(new Uint8Array(digest));

  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createDemoIpfsCid(hash: string) {
  return `bafy${hash.slice(0, 43).toLowerCase()}`;
}

export function createDemoTransactionHash(hash: string) {
  return `0x${hash.slice(0, 64)}`;
}

export function createQrToken(certificateId: string, batchNumber: string) {
  const normalizedBatch = batchNumber.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return `${normalizedBatch}-${certificateId.toLowerCase()}`;
}
