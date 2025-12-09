/**
 * Ledger key helpers for building footprint entries.
 */
import { xdr, Address, Keypair } from "stellar-sdk";

/**
 * Creates a ledger key for a Stellar account.
 */
export function createAccountKey(keypair: Keypair): xdr.LedgerKey {
  return xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({
      accountId: keypair.xdrPublicKey(),
    })
  );
}

/**
 * Creates a ledger key for a G-account's nonce entry.
 */
export function createNonceKey(
  signerPublicKey: string,
  nonce: xdr.Int64
): xdr.LedgerKey {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(signerPublicKey).toScAddress(),
      key: xdr.ScVal.scvLedgerKeyNonce(new xdr.ScNonceKey({ nonce })),
      durability: xdr.ContractDataDurability.temporary(),
    })
  );
}

/**
 * Creates a persistent contract data ledger key.
 */
function createPersistentDataKey(
  contractAddress: xdr.ScAddress,
  key: xdr.ScVal
): xdr.LedgerKey {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: contractAddress,
      key,
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
}

// ============================================================================
// OZ Smart Account Storage Keys
// These keys follow the OpenZeppelin smart account storage pattern.
// ============================================================================

/**
 * Creates ledger key for context rule IDs - CallContract context.
 * Storage key: ["Ids", ["CallContract", contractAddress]]
 */
export function createIdsCallContractKey(
  smartAccountId: string
): xdr.LedgerKey {
  const contractAddress = new Address(smartAccountId).toScAddress();
  return createPersistentDataKey(
    contractAddress,
    xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol("Ids"),
      xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol("CallContract"),
        new Address(smartAccountId).toScVal(),
      ]),
    ])
  );
}

/**
 * Creates ledger key for context rule IDs - Default context.
 * Storage key: ["Ids", ["Default"]]
 */
export function createIdsDefaultKey(smartAccountId: string): xdr.LedgerKey {
  const contractAddress = new Address(smartAccountId).toScAddress();
  return createPersistentDataKey(
    contractAddress,
    xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol("Ids"),
      xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Default")]),
    ])
  );
}

/**
 * Creates ledger key for rule metadata.
 * Storage key: ["Meta", ruleId]
 */
export function createMetaKey(
  smartAccountId: string,
  ruleId: number = 0
): xdr.LedgerKey {
  const contractAddress = new Address(smartAccountId).toScAddress();
  return createPersistentDataKey(
    contractAddress,
    xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Meta"), xdr.ScVal.scvU32(ruleId)])
  );
}

/**
 * Creates ledger key for rule signers.
 * Storage key: ["Signers", ruleId]
 */
export function createSignersKey(
  smartAccountId: string,
  ruleId: number = 0
): xdr.LedgerKey {
  const contractAddress = new Address(smartAccountId).toScAddress();
  return createPersistentDataKey(
    contractAddress,
    xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Signers"), xdr.ScVal.scvU32(ruleId)])
  );
}

/**
 * Creates ledger key for rule policies.
 * Storage key: ["Policies", ruleId]
 */
export function createPoliciesKey(
  smartAccountId: string,
  ruleId: number = 0
): xdr.LedgerKey {
  const contractAddress = new Address(smartAccountId).toScAddress();
  return createPersistentDataKey(
    contractAddress,
    xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol("Policies"),
      xdr.ScVal.scvU32(ruleId),
    ])
  );
}

/**
 * Creates all storage keys needed for OZ smart account __check_auth.
 */
export function createSmartAccountStorageKeys(
  smartAccountId: string,
  ruleId: number = 0
): xdr.LedgerKey[] {
  return [
    createIdsCallContractKey(smartAccountId),
    createIdsDefaultKey(smartAccountId),
    createMetaKey(smartAccountId, ruleId),
    createSignersKey(smartAccountId, ruleId),
    createPoliciesKey(smartAccountId, ruleId),
  ];
}
