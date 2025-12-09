/**
 * Delegated Signer Plugin for smart accounts.
 *
 * Handles OpenZeppelin smart account delegated signers at simulation output time.
 * See: https://docs.openzeppelin.com/stellar-contracts/accounts/signers-and-verifiers#ed25519
 */
import { hash, Keypair, authorizeEntry } from "stellar-sdk";
import { Buffer } from "buffer";
import {
  ContractId,
  P_SimulateTransaction,
  type LocalSigner,
  type SimulateTransactionOutput,
} from "@colibri/core";

import {
  findContractAuthEntryIndex,
  computeAuthPayloadHash,
  buildUnsignedAuthEntry,
} from "../../utils/soroban/auth.ts";
import {
  createAccountKey,
  createNonceKey,
} from "../../utils/soroban/ledger-keys.ts";
import {
  buildUpdatedResources,
  buildUpdatedTransactionData,
} from "../../utils/soroban/resources.ts";
import { buildCheckAuthInvocation } from "../auth.ts";
import { createStorageKeys } from "../storage/ledger-keys.ts";
import {
  buildDelegatedSignerKey,
  buildSignaturesValue,
} from "../storage/signatures.ts";

const PLUGIN_NAME = "DelegatedSignerPlugin";

// ============================================================================
// Types
// ============================================================================

export type DelegatedSignerPluginArgs = {
  /** The smart account contract ID */
  smartAccountId: ContractId;
  /** The delegated signer (LocalSigner from colibri) */
  signer: LocalSigner;
  /** Network passphrase */
  networkPassphrase: string;
  /** Extra CPU instructions for __check_auth execution (default: 1_500_000) */
  extraInstructions?: number;
  /** Extra bytes for read (default: 5000) */
  extraReadBytes?: number;
  /** Extra bytes for write (default: 100) */
  extraWriteBytes?: number;
};

export type PluginOutput = SimulateTransactionOutput;

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * Creates a plugin that:
 * 1. Finds the smart account's auth entry
 * 2. Updates it with Signatures(Map<Signer, Bytes>) and expiration
 * 3. Computes payload hash for __check_auth
 * 4. Builds and signs the __check_auth auth entry
 * 5. Updates footprint with required ledger keys
 * 6. Bumps resources to account for extra execution
 */
const create = ({
  smartAccountId,
  signer,
  networkPassphrase,
  extraInstructions = 1_500_000,
  extraReadBytes = 5000,
  extraWriteBytes = 100,
}: DelegatedSignerPluginArgs) => {
  const keypair = Keypair.fromSecret(signer.secretKey());
  const networkId = hash(Buffer.from(networkPassphrase));

  return {
    name: PLUGIN_NAME,
    processOutput: async (output: PluginOutput): Promise<PluginOutput> => {
      if (!output.result?.auth || output.result.auth.length === 0) {
        return output;
      }

      // Step 1: Find the smart account's auth entry
      const entryIndex = findContractAuthEntryIndex(
        output.result.auth,
        smartAccountId
      );
      if (entryIndex === -1) {
        return output;
      }

      const entry = output.result.auth[entryIndex];
      const rootInvocation = entry.rootInvocation();
      const creds = entry.credentials().address();
      const nonce = creds.nonce();

      // Step 2: Update entry with signature and expiration
      const expirationLedger = output.latestLedger + 100;
      const signerKey = buildDelegatedSignerKey(keypair.publicKey());

      creds.signatureExpirationLedger(expirationLedger);
      creds.signature(buildSignaturesValue(signerKey));

      // Step 3: Compute payload hash
      const payloadHash = computeAuthPayloadHash(
        networkId,
        nonce,
        expirationLedger,
        rootInvocation
      );

      // Step 4: Build and sign __check_auth entry
      const checkAuthInvocation = buildCheckAuthInvocation(
        smartAccountId,
        payloadHash
      );
      const unsignedEntry = buildUnsignedAuthEntry(
        keypair.publicKey(),
        expirationLedger,
        checkAuthInvocation
      );
      const signedEntry = await authorizeEntry(
        unsignedEntry,
        keypair,
        expirationLedger,
        networkPassphrase
      );

      // Step 5: Update footprint
      const signedNonce = signedEntry.credentials().address().nonce();
      const readOnlyKeys = [
        createAccountKey(keypair),
        ...createStorageKeys(smartAccountId),
      ];
      const readWriteKeys = [createNonceKey(keypair.publicKey(), signedNonce)];

      // Step 6: Build updated resources
      const currentData = output.transactionData.build();
      const newResources = buildUpdatedResources(
        currentData.resources(),
        readOnlyKeys,
        readWriteKeys,
        extraInstructions,
        extraReadBytes,
        extraWriteBytes
      );
      const { transactionData, resourceFee } = buildUpdatedTransactionData(
        currentData,
        newResources
      );

      // Build new auth array
      const newAuth = [...output.result.auth];
      newAuth[entryIndex] = entry;
      newAuth.push(signedEntry);

      return {
        ...output,
        result: { ...output.result, auth: newAuth },
        transactionData,
        minResourceFee: resourceFee,
      };
    },
  };
};

export const PLG_DelegatedSigner = {
  create,
  name: PLUGIN_NAME,
  target: P_SimulateTransaction().name,
};
