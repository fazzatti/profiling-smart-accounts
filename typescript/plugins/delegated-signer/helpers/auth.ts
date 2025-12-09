/**
 * Authorization helpers for building and signing auth entries.
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
 * This hash is passed to __check_auth and signed by the delegated signer.
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
 * Builds a __check_auth invocation for a smart account.
 */
export function buildCheckAuthInvocation(
  smartAccountId: string,
  payloadHash: Buffer
): xdr.SorobanAuthorizedInvocation {
  const checkAuthArgs = new xdr.InvokeContractArgs({
    contractAddress: new Address(smartAccountId).toScAddress(),
    functionName: Buffer.from("__check_auth"),
    args: [xdr.ScVal.scvBytes(payloadHash)],
  });

  return new xdr.SorobanAuthorizedInvocation({
    function:
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        checkAuthArgs
      ),
    subInvocations: [],
  });
}

/**
 * Builds an unsigned auth entry for a signer's __check_auth call.
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
