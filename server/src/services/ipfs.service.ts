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
  return Boolean(env.PINATA_JWT?.trim());
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

function createGatewayUrl(cid: string) {
  const gateway = env.PINATA_GATEWAY?.trim();

  if (!gateway) {
    return `ipfs://${cid}`;
  }

  return `https://${gateway.replace(/^https?:\/\//, "")}/ipfs/${cid}`;
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
      gatewayUrl: `ipfs://${cid}`,
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
