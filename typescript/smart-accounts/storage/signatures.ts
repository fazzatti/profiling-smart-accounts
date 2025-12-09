/**
 * Smart account signature helpers.
 * These build the signature format expected by OpenZeppelin smart accounts.
 */
import { xdr, Address } from "stellar-sdk";
import { Buffer } from "buffer";

/**
 * Builds the Signer::Delegated key format: Vec([Symbol("Delegated"), Address])
 */
export function buildDelegatedSignerKey(publicKey: string): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Delegated"),
    new Address(publicKey).toScVal(),
  ]);
}

/**
 * Builds the Signatures value: Vec containing Map<Signer, Bytes>
 * For delegated signers, the bytes value is empty (signature is in __check_auth entry).
 */
export function buildSignaturesValue(signerKey: xdr.ScVal): xdr.ScVal {
  const signerMap = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: signerKey,
      val: xdr.ScVal.scvBytes(Buffer.alloc(0)),
    }),
  ]);
  return xdr.ScVal.scvVec([signerMap]);
}
