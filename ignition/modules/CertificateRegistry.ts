import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CertificateRegistryModule", (m) => {
  const registry = m.contract("CertificateRegistry");

  return { registry };
});
