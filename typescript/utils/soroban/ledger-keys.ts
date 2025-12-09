/**
 * Generic Soroban ledger key helpers.
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
export function createPersistentDataKey(
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
