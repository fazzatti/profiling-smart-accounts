import {
  Contract,
  ContractId,
  Ed25519PublicKey,
  TransactionConfig,
} from "@colibri/core";
import { config } from "../../config/settings.ts";
import { loadWasmFile } from "../../utils/load-wasm.ts";
import {
  ContextRule,
  ContextRuleType,
  Methods,
  Payload,
  Signer,
} from "./types.ts";
import { Buffer } from "buffer";

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
