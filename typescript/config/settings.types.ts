import { ContractId, Ed25519SecretKey } from "@colibri/core";

export type SettingsBasic = {
  adminSk: Ed25519SecretKey;
  johnSk: Ed25519SecretKey;
  accountSignerSk: Ed25519SecretKey;
  accountId: ContractId;
};
