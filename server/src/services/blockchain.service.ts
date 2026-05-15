import { Contract, JsonRpcProvider, Wallet, id } from "ethers";
import { env } from "../config/env";
import { createDemoTransactionHash } from "../utils/hash";
import { HttpError } from "../utils/httpError";

const certificateRegistryAbi = [
  "function registerCertificate(bytes32 certificateId, bytes32 documentHash, string cid) external",
  "function getCertificate(bytes32 certificateId) external view returns (bytes32 documentHash, string cid, uint256 timestamp, address issuer, bool exists)",
  "function isCertificateValid(bytes32 certificateId, bytes32 documentHash) external view returns (bool)",
];

interface RegisterCertificateOnChainInput {
  certificateNo: string;
  fileHash: string;
  ipfsCid: string;
}

interface BlockchainRegistrationResult {
  txHash: string;
  blockNumber: number | null;
  network: "polygon-amoy";
  provider: "polygon-amoy" | "demo";
  contract?: string;
}

interface VerifyCertificateOnChainInput {
  certificateNo: string;
  fileHash: string;
  hasTransaction: boolean;
}

interface BlockchainVerificationResult {
  isValid: boolean;
  blockchainHash: string | null;
  provider: "polygon-amoy" | "demo";
}

interface TransactionLike {
  hash: string;
  wait(confirmations?: number): Promise<{ blockNumber: number } | null>;
}

type ChainCertificateTuple = readonly [
  documentHash: string,
  cid: string,
  timestamp: bigint,
  issuer: string,
  exists: boolean,
];

function isBlockchainConfigured() {
  return Boolean(
    env.POLYGON_AMOY_RPC_URL?.trim() &&
      env.POLYGON_PRIVATE_KEY?.trim() &&
      env.CERTIFICATE_CONTRACT_ADDRESS?.trim()
  );
}

function getCertificateId(certificateNo: string) {
  return id(certificateNo);
}

function getDocumentHash(fileHash: string) {
  const normalizedHash = fileHash.replace(/^0x/, "").toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(normalizedHash)) {
    throw new HttpError(400, "Некорректный SHA-256 хеш сертификата");
  }

  return `0x${normalizedHash}`;
}

function getContract() {
  if (!isBlockchainConfigured()) {
    return null;
  }

  const provider = new JsonRpcProvider(env.POLYGON_AMOY_RPC_URL);
  const wallet = new Wallet(env.POLYGON_PRIVATE_KEY ?? "", provider);

  return new Contract(
    env.CERTIFICATE_CONTRACT_ADDRESS ?? "",
    certificateRegistryAbi,
    wallet
  );
}

export async function registerCertificateOnChain(
  input: RegisterCertificateOnChainInput
): Promise<BlockchainRegistrationResult> {
  const documentHash = getDocumentHash(input.fileHash);
  const contract = getContract();

  if (!contract) {
    return {
      txHash: createDemoTransactionHash(
        `${input.certificateNo}:${input.fileHash}:${input.ipfsCid}`
      ),
      blockNumber: null,
      network: "polygon-amoy",
      provider: "demo",
      contract: env.CERTIFICATE_CONTRACT_ADDRESS,
    };
  }

  try {
    const tx = (await contract.getFunction("registerCertificate")(
      getCertificateId(input.certificateNo),
      documentHash,
      input.ipfsCid
    )) as TransactionLike;
    const receipt = await tx.wait(1);

    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber ?? null,
      network: "polygon-amoy",
      provider: "polygon-amoy",
      contract: env.CERTIFICATE_CONTRACT_ADDRESS,
    };
  } catch (error) {
    console.error(error);
    throw new HttpError(502, "Не удалось записать сертификат в Polygon Amoy");
  }
}

export async function verifyCertificateOnChain(
  input: VerifyCertificateOnChainInput
): Promise<BlockchainVerificationResult> {
  const documentHash = getDocumentHash(input.fileHash);
  const contract = getContract();

  if (!contract) {
    return {
      isValid: input.hasTransaction,
      blockchainHash: input.hasTransaction ? documentHash : null,
      provider: "demo",
    };
  }

  try {
    const certificateId = getCertificateId(input.certificateNo);
    const chainCertificate = (await contract
      .getFunction("getCertificate")
      .staticCall(certificateId)) as ChainCertificateTuple;
    const isValid = Boolean(
      await contract
        .getFunction("isCertificateValid")
        .staticCall(certificateId, documentHash)
    );

    return {
      isValid: chainCertificate[4] && isValid,
      blockchainHash: chainCertificate[4] ? chainCertificate[0] : null,
      provider: "polygon-amoy",
    };
  } catch (error) {
    console.error(error);
    throw new HttpError(502, "Не удалось проверить сертификат в Polygon Amoy");
  }
}
