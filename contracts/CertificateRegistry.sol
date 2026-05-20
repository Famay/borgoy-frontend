// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CertificateRegistry {
  address public owner;

  struct Certificate {
    bytes32 documentHash;
    string cid;
    uint256 timestamp;
    address issuer;
    bool exists;
  }

  mapping(bytes32 certificateId => Certificate certificate) private certificates;

  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  event CertificateRegistered(
    bytes32 indexed certificateId,
    bytes32 indexed documentHash,
    string cid,
    address indexed issuer
  );

  error CertificateAlreadyRegistered(bytes32 certificateId);
  error EmptyCertificateId();
  error EmptyDocumentHash();
  error EmptyCid();
  error InvalidOwner();
  error Unauthorized();

  modifier onlyOwner() {
    if (msg.sender != owner) {
      revert Unauthorized();
    }

    _;
  }

  constructor() {
    owner = msg.sender;
    emit OwnershipTransferred(address(0), msg.sender);
  }

  function transferOwnership(address newOwner) external onlyOwner {
    if (newOwner == address(0)) {
      revert InvalidOwner();
    }

    address previousOwner = owner;
    owner = newOwner;

    emit OwnershipTransferred(previousOwner, newOwner);
  }

  function registerCertificate(
    bytes32 certificateId,
    bytes32 documentHash,
    string calldata cid
  ) external onlyOwner {
    if (certificateId == bytes32(0)) {
      revert EmptyCertificateId();
    }

    if (documentHash == bytes32(0)) {
      revert EmptyDocumentHash();
    }

    if (bytes(cid).length == 0) {
      revert EmptyCid();
    }

    if (certificates[certificateId].exists) {
      revert CertificateAlreadyRegistered(certificateId);
    }

    certificates[certificateId] = Certificate({
      documentHash: documentHash,
      cid: cid,
      timestamp: block.timestamp,
      issuer: msg.sender,
      exists: true
    });

    emit CertificateRegistered(certificateId, documentHash, cid, msg.sender);
  }

  function getCertificate(
    bytes32 certificateId
  )
    external
    view
    returns (
      bytes32 documentHash,
      string memory cid,
      uint256 timestamp,
      address issuer,
      bool exists
    )
  {
    Certificate storage certificate = certificates[certificateId];

    return (
      certificate.documentHash,
      certificate.cid,
      certificate.timestamp,
      certificate.issuer,
      certificate.exists
    );
  }

  function isCertificateValid(
    bytes32 certificateId,
    bytes32 documentHash
  ) external view returns (bool) {
    Certificate storage certificate = certificates[certificateId];

    return certificate.exists && certificate.documentHash == documentHash;
  }
}
