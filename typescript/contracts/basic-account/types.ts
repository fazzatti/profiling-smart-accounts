import { ContractId, Ed25519PublicKey } from "@colibri/core";
import { Buffer } from "buffer";

export enum Methods {
  // Initialization
  Constructor = "__constructor",

  // SmartAccount trait - Context Rules
  AddContextRule = "add_context_rule",
  UpdateContextRuleName = "update_context_rule_name",
  UpdateContextRuleValidUntil = "update_context_rule_valid_until",
  RemoveContextRule = "remove_context_rule",
  ContextRule = "context_rule",
  ContextRules = "context_rules",

  // SmartAccount trait - Signers
  AddSigner = "add_signer",
  RemoveSigner = "remove_signer",

  // SmartAccount trait - Policies
  AddPolicy = "add_policy",
  RemovePolicy = "remove_policy",

  // ExecutionEntryPoint trait
  Execute = "execute",

  // Upgradeable
  Upgrade = "upgrade",
}

// Signer types - tag/values format for Soroban enums
export type DelegatedSigner = {
  tag: "Delegated";
  values: [Ed25519PublicKey];
};

export type ExternalSigner = {
  tag: "External";
  values: [ContractId, Buffer];
};

export type Signer = DelegatedSigner | ExternalSigner;

// Context rule types - tag/values format for Soroban enums
export type DefaultContext = { tag: "Default"; values: [] };
export type CallContractContext = { tag: "CallContract"; values: [ContractId] };
export type CreateContractContext = { tag: "CreateContract"; values: [string] };

export type ContextRuleType =
  | DefaultContext
  | CallContractContext
  | CreateContractContext;

// Context rule structure
export interface ContextRule {
  id: number;
  context_type: ContextRuleType;
  name: string;
  signers: Signer[];
  policies: Map<ContractId, any>; // Map<policy_address, install_param>
  valid_until: number | null;
}

// Payload types for each method
export type Payload = {
  [Methods.Constructor]: {
    signers: Signer[];
    policies: Map<ContractId, any>; // Map<policy_contract_id, install_param>
  };

  [Methods.AddContextRule]: {
    context_type: ContextRuleType;
    name: string;
    valid_until: number | null;
    signers: Signer[];
    policies: Map<ContractId, any>;
  };

  [Methods.UpdateContextRuleName]: {
    id: number;
    name: string;
  };

  [Methods.UpdateContextRuleValidUntil]: {
    id: number;
    valid_until: number | null;
  };

  [Methods.RemoveContextRule]: {
    id: number;
  };

  [Methods.ContextRule]: {
    id: number;
  };

  [Methods.ContextRules]: {
    context_type: ContextRuleType;
  };

  [Methods.AddSigner]: {
    context_rule_id: number;
    signer: Signer;
  };

  [Methods.RemoveSigner]: {
    context_rule_id: number;
    signer: Signer;
  };

  [Methods.AddPolicy]: {
    context_rule_id: number;
    policy: ContractId;
    install_param: any;
  };

  [Methods.RemovePolicy]: {
    context_rule_id: number;
    policy: ContractId;
  };

  [Methods.Execute]: {
    target: ContractId;
    target_fn: string;
    target_args: unknown[];
  };
  [Methods.Upgrade]: {
    new_wasm_hash: Buffer;
  };
};
