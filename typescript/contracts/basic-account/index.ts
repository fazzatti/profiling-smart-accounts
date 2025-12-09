import {
  Contract,
  ContractId,
  Ed25519PublicKey,
  TransactionConfig,
} from "@colibri/core";
import { config } from "../../config/settings.ts";
import { loadWasmFile } from "../../utils/load-wasm.ts";
import { ContextRuleType, Methods, Payload, Signer } from "./types.ts";
import { Buffer } from "buffer";
import { xdr, Address, hash } from "stellar-sdk";

const { networkConfig, basicAccountWasmFile } = config;

const wasm = await loadWasmFile(basicAccountWasmFile);

export class BasicAccount extends Contract {
  constructor(contractId?: string) {
    super({
      networkConfig,
      // deno-lint-ignore no-explicit-any
      contractConfig: { wasm, contractId } as any,
    });
  }

  // Context Rule Management
  async addContextRule({
    contextType,
    name,
    validUntil,
    signers,
    policies,
    config,
  }: {
    contextType: ContextRuleType;
    name: string;
    validUntil: number | null;
    signers: Signer[];
    policies: Map<string, unknown>;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.AddContextRule,
      methodArgs: {
        context_type: contextType,
        name,
        valid_until: validUntil,
        signers,
        policies,
      } as Payload[Methods.AddContextRule],
      config,
    });
  }

  async getContextRule({
    id,
    config,
  }: {
    id: number;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.ContextRule,
      methodArgs: { id } as Payload[Methods.ContextRule],
      config,
    });
  }

  async getContextRules({
    contextType,
    config,
  }: {
    contextType: ContextRuleType;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.ContextRules,
      methodArgs: {
        context_type: contextType,
      } as Payload[Methods.ContextRules],
      config,
    });
  }

  async removeContextRule({
    id,
    config,
  }: {
    id: number;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.RemoveContextRule,
      methodArgs: { id } as Payload[Methods.RemoveContextRule],
      config,
    });
  }

  // Signer Management
  async addSigner({
    contextRuleId,
    signer,
    config,
  }: {
    contextRuleId: number;
    signer: Signer;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.AddSigner,
      methodArgs: {
        context_rule_id: contextRuleId,
        signer,
      } as Payload[Methods.AddSigner],
      config,
    });
  }

  async removeSigner({
    contextRuleId,
    signer,
    config,
  }: {
    contextRuleId: number;
    signer: Signer;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.RemoveSigner,
      methodArgs: {
        context_rule_id: contextRuleId,
        signer,
      } as Payload[Methods.RemoveSigner],
      config,
    });
  }

  // Policy Management
  async addPolicy({
    contextRuleId,
    policy,
    installParam,
    config,
  }: {
    contextRuleId: number;
    policy: string;
    installParam: unknown;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.AddPolicy,
      methodArgs: {
        context_rule_id: contextRuleId,
        policy,
        install_param: installParam,
      } as Payload[Methods.AddPolicy],
      config,
    });
  }

  async removePolicy({
    contextRuleId,
    policy,
    config,
  }: {
    contextRuleId: number;
    policy: string;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.RemovePolicy,
      methodArgs: {
        context_rule_id: contextRuleId,
        policy,
      } as Payload[Methods.RemovePolicy],
      config,
    });
  }

  // Execute calls through the smart account
  async execute({
    contractAddress,
    functionName,
    args,
    config,
  }: {
    contractAddress: string;
    functionName: string;
    args: unknown[];
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.Execute,
      methodArgs: {
        target: contractAddress,
        target_fn: functionName,
        target_args: args,
      } as Payload[Methods.Execute],
      config,
    });
  }

  // Upgrade the contract
  async upgrade({
    newWasmHash,
    config,
  }: {
    newWasmHash: Buffer;
    config: TransactionConfig;
  }) {
    return await this.invoke({
      method: Methods.Upgrade,
      methodArgs: {
        new_wasm_hash: newWasmHash,
      } as Payload[Methods.Upgrade],
      config,
    });
  }
}

// Helper functions

// Helper functions - use tag/values format for Soroban enums
export function createDelegatedSigner(publicKey: Ed25519PublicKey): Signer {
  return { tag: "Delegated", values: [publicKey] };
}

export function createExternalSigner(
  verifierContractId: ContractId,
  publicKeyBytes: Buffer
): Signer {
  return { tag: "External", values: [verifierContractId, publicKeyBytes] };
}

export function defaultContext(): ContextRuleType {
  return { tag: "Default", values: [] };
}

export function callContractContext(
  contractAddress: ContractId
): ContextRuleType {
  return { tag: "CallContract", values: [contractAddress] };
}

export function createContractContext(wasmHash: string): ContextRuleType {
  return { tag: "CreateContract", values: [wasmHash] };
}

/**
 * Builds both auth entries needed for a delegated signer flow:
 * 1. Smart Account auth entry with OZ Signatures format
 * 2. Delegated signer auth entry for __check_auth invocation
 */
function buildSmartAccountAuthEntries({
  smartAccountId,
  delegatedSignerPubKey,
  targetContract,
  targetFn,
  targetArgs,
  networkPassphrase,
}: {
  smartAccountId: ContractId;
  delegatedSignerPubKey: Ed25519PublicKey;
  targetContract: string;
  targetFn: string;
  targetArgs: unknown[];
  networkPassphrase: string;
}): xdr.SorobanAuthorizationEntry[] {
  const networkId = hash(Buffer.from(networkPassphrase));

  // Generate nonces
  const smartAccountNonce = xdr.Int64.fromString(
    Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString()
  );
  const delegatedSignerNonce = xdr.Int64.fromString(
    Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString()
  );

  // --- Build the execute() invocation (root invocation for entry 1) ---
  const executeArgs = new xdr.InvokeContractArgs({
    contractAddress: new Address(smartAccountId).toScAddress(),
    functionName: "execute",
    args: [
      new Address(targetContract).toScVal(),
      xdr.ScVal.scvSymbol(targetFn),
      xdr.ScVal.scvVec(targetArgs as xdr.ScVal[]),
    ],
  });

  const executeInvocation = new xdr.SorobanAuthorizedInvocation({
    function:
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        executeArgs
      ),
    subInvocations: [],
  });

  // --- Build Entry 1: Smart Account auth with OZ Signatures format ---
  // Signature format: Vec[ Map[ {Vec[Symbol("Delegated"), Address]} -> Bytes("") ] ]
  const ozSignature = xdr.ScVal.scvVec([
    xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvVec([
          xdr.ScVal.scvSymbol("Delegated"),
          new Address(delegatedSignerPubKey).toScVal(),
        ]),
        val: xdr.ScVal.scvBytes(Buffer.alloc(0)), // Empty bytes for Delegated
      }),
    ]),
  ]);

  const entry1 = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(smartAccountId).toScAddress(),
        nonce: smartAccountNonce,
        signatureExpirationLedger: 0, // Will be set by colibri
        signature: ozSignature,
      })
    ),
    rootInvocation: executeInvocation,
  });

  // --- Compute signature_payload hash for entry 2 ---
  // This is what __check_auth receives and what require_auth_for_args expects
  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    new xdr.HashIdPreimageSorobanAuthorization({
      networkId,
      nonce: smartAccountNonce,
      signatureExpirationLedger: 0, // Will match entry1's expiration
      invocation: executeInvocation,
    })
  );
  const signaturePayload = hash(preimage.toXDR());

  // --- Build Entry 2: Delegated signer auth for __check_auth ---
  const checkAuthArgs = new xdr.InvokeContractArgs({
    contractAddress: new Address(smartAccountId).toScAddress(),
    functionName: "__check_auth",
    args: [xdr.ScVal.scvBytes(signaturePayload)],
  });

  const checkAuthInvocation = new xdr.SorobanAuthorizedInvocation({
    function:
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        checkAuthArgs
      ),
    subInvocations: [],
  });

  // Entry 2 credentials - signature will be filled by colibri's signing
  const entry2 = new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(delegatedSignerPubKey).toScAddress(),
        nonce: delegatedSignerNonce,
        signatureExpirationLedger: 0, // Will be set by colibri
        signature: xdr.ScVal.scvVoid(), // Will be signed by colibri
      })
    ),
    rootInvocation: checkAuthInvocation,
  });

  return [entry1, entry2];
}
