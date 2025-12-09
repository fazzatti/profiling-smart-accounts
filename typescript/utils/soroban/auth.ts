/**
 * Generic Soroban authorization helpers.
 */
import { xdr, Address, hash } from "stellar-sdk";
import { Buffer } from "buffer";

/**
 * Finds the index of a contract's auth entry in auth entries array.
 */
export function findContractAuthEntryIndex(
  authEntries: xdr.SorobanAuthorizationEntry[],
  contractId: string
): number {
  return authEntries.findIndex((entry) => {
    try {
      const creds = entry.credentials();
      if (
        creds.switch() !==
        xdr.SorobanCredentialsType.sorobanCredentialsAddress()
      ) {
        return false;
      }
      const addr = creds.address().address();
      return Address.fromScAddress(addr).toString() === contractId;
    } catch {
      return false;
    }
  });
}

/**
 * Computes the authorization payload hash for a soroban auth entry.
 * This hash is what gets signed by signers.
 */
export function computeAuthPayloadHash(
  networkId: Buffer,
  nonce: xdr.Int64,
  signatureExpirationLedger: number,
  rootInvocation: xdr.SorobanAuthorizedInvocation
): Buffer {
  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    new xdr.HashIdPreimageSorobanAuthorization({
      networkId,
      nonce,
      signatureExpirationLedger,
      invocation: rootInvocation,
    })
  );
  return hash(preimage.toXDR());
}

/**
 * Builds an unsigned auth entry for a signer.
 */
export function buildUnsignedAuthEntry(
  signerPublicKey: string,
  signatureExpirationLedger: number,
  rootInvocation: xdr.SorobanAuthorizedInvocation
): xdr.SorobanAuthorizationEntry {
  const nonce = xdr.Int64.fromString(
    Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString()
  );

  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(signerPublicKey).toScAddress(),
        nonce,
        signatureExpirationLedger,
        signature: xdr.ScVal.scvVoid(),
      })
    ),
    rootInvocation,
  });
}
