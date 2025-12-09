/**
 * Smart account storage ledger key helpers.
 * These follow the OpenZeppelin smart account storage pattern.
 */
import { xdr, Address } from "stellar-sdk";
import { createPersistentDataKey } from "../../utils/soroban/ledger-keys.ts";

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
 * Creates all storage keys needed for smart account __check_auth.
 */
export function createStorageKeys(
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
