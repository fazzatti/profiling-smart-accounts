/**
 * Smart account authorization helpers.
 * Helpers for working with __check_auth pattern.
 */
import { xdr, Address } from "stellar-sdk";
import { Buffer } from "buffer";

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
