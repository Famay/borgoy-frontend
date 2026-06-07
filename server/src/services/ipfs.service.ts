import { File } from "node:buffer";
import { PinataSDK } from "pinata";
import { env } from "../config/env";
import { createDemoIpfsCid } from "../utils/hash";
import { HttpError } from "../utils/httpError";

interface UploadCertificateToIpfsInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileHash: string;
  certificateNo: string;
  batchNumber: string;
}

interface IpfsUploadResult {
  cid: string;
  provider: "pinata" | "demo";
  gatewayUrl?: string;
}

let pinataClient: PinataSDK | null = null;

function isPinataConfigured() {
  return env.INTEGRATION_MODE === "live";
}

function getPinataClient() {
  if (!isPinataConfigured()) {
    return null;
  }

  if (!pinataClient) {
    pinataClient = new PinataSDK({
      pinataJwt: env.PINATA_JWT,
      pinataGateway: env.PINATA_GATEWAY,
    });
  }

  return pinataClient;
}

export function createGatewayUrl(cid?: string | null) {
  if (!cid) {
    return undefined;
  }

  const gateway = env.PINATA_GATEWAY?.trim();

  if (!gateway) {
    return `https://ipfs.io/ipfs/${encodeURIComponent(cid)}`;
  }

  const normalizedGateway = gateway
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .replace(/\/ipfs$/, "");

  return `https://${normalizedGateway}/ipfs/${encodeURIComponent(cid)}`;
}

export async function uploadCertificateToIpfs(
  input: UploadCertificateToIpfsInput
): Promise<IpfsUploadResult> {
  const pinata = getPinataClient();

  if (!pinata) {
    const cid = createDemoIpfsCid(input.fileHash);

    return {
      cid,
      provider: "demo",
      gatewayUrl: createGatewayUrl(cid),
    };
  }

  try {
    const file = new File([input.buffer], input.fileName, {
      type: input.mimeType,
    });
    const upload = await pinata.upload.public
      .file(file)
      .name(input.fileName)
      .keyvalues({
        batchNumber: input.batchNumber,
        certificateNo: input.certificateNo,
        fileHash: input.fileHash,
      });

    return {
      cid: upload.cid,
      provider: "pinata",
      gatewayUrl: createGatewayUrl(upload.cid),
    };
  } catch (error) {
    console.error(error);
    throw new HttpError(502, "Не удалось загрузить сертификат в Pinata/IPFS");
  }
}
