import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("CertificateRegistry", function () {
  const certificateId = ethers.id("CERT-2026-001");
  const documentHash = ethers.keccak256(
    ethers.toUtf8Bytes("certificate-document")
  );
  const cid = "bafkreid7qoywk77r7rj3slobqfekdvs57qwuwh5d2z3sqsw52iabe3mqne";

  it("registers certificate metadata", async function () {
    const [issuer] = await ethers.getSigners();
    const registry = await ethers.deployContract("CertificateRegistry");

    await expect(registry.registerCertificate(certificateId, documentHash, cid))
      .to.emit(registry, "CertificateRegistered")
      .withArgs(certificateId, documentHash, cid, issuer.address);

    const certificate = await registry.getCertificate(certificateId);

    expect(certificate.documentHash).to.equal(documentHash);
    expect(certificate.cid).to.equal(cid);
    expect(certificate.issuer).to.equal(issuer.address);
    expect(certificate.exists).to.equal(true);
    expect(certificate.timestamp).to.be.greaterThan(0n);
  });

  it("validates the registered document hash", async function () {
    const registry = await ethers.deployContract("CertificateRegistry");

    await registry.registerCertificate(certificateId, documentHash, cid);

    await expect(
      registry.isCertificateValid(certificateId, documentHash)
    ).to.eventually.equal(true);
    await expect(
      registry.isCertificateValid(
        certificateId,
        ethers.keccak256(ethers.toUtf8Bytes("changed-document"))
      )
    ).to.eventually.equal(false);
  });

  it("rejects duplicate certificate ids", async function () {
    const registry = await ethers.deployContract("CertificateRegistry");

    await registry.registerCertificate(certificateId, documentHash, cid);

    await expect(
      registry.registerCertificate(certificateId, documentHash, cid)
    )
      .to.be.revertedWithCustomError(
        registry,
        "CertificateAlreadyRegistered"
      )
      .withArgs(certificateId);
  });

  it("rejects empty certificate data", async function () {
    const registry = await ethers.deployContract("CertificateRegistry");

    await expect(
      registry.registerCertificate(ethers.ZeroHash, documentHash, cid)
    ).to.be.revertedWithCustomError(registry, "EmptyCertificateId");
    await expect(
      registry.registerCertificate(certificateId, ethers.ZeroHash, cid)
    ).to.be.revertedWithCustomError(registry, "EmptyDocumentHash");
    await expect(
      registry.registerCertificate(certificateId, documentHash, "")
    ).to.be.revertedWithCustomError(registry, "EmptyCid");
  });
});
