import { hash, Keypair, authorizeEntry } from "stellar-sdk";
import { Buffer } from "buffer";
import {
  ContractId,
  P_SimulateTransaction,
  type LocalSigner,
  type SimulateTransactionOutput,
} from "@colibri/core";

import * as Auth from "./helpers/auth.ts";
import * as LedgerKeys from "./helpers/ledger-keys.ts";
import * as Resources from "./helpers/resources.ts";
import * as Signatures from "./helpers/signatures.ts";

const PLUGIN_NAME = "DelegatedSignerPlugin";

// ============================================================================
// Types
// ============================================================================

export type DelegatedSignerPluginArgs = {
  /** The smart account contract ID this plugin is for */
  smartAccountId: ContractId;
  /** The delegated signer (LocalSigner from colibri) */
  signer: LocalSigner;
  /** Network passphrase */
  networkPassphrase: string;
  /** Extra CPU instructions to add for the __check_auth execution (default: 1_500_000) */
  extraInstructions?: number;
  /** Extra bytes to add for read (default: 5000) */
  extraReadBytes?: number;
  /** Extra bytes to add for write (default: 100) */
  extraWriteBytes?: number;
};

export type PluginOutput = SimulateTransactionOutput;

// ============================================================================
// Plugin Factory
// ============================================================================

/**
 * Plugin that handles OZ smart account delegated signers at simulation output time.
 *
 * Following OZ docs: https://docs.openzeppelin.com/stellar-contracts/accounts/signers-and-verifiers#ed25519
 *
 * It acts on the OUTPUT of P_SimulateTransaction:
 * 1. Finds the smart account's auth entry
 * 2. Updates it with proper Signatures(Map<Signer, Bytes>) and expiration
 * 3. Computes payload hash using smart account entry's nonce + our expiration + rootInvocation
 * 4. Builds and signs the __check_auth auth entry for the delegated signer
 * 5. Adds it to result.auth
 * 6. Bumps the resources in transactionData to account for extra execution
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

  const plugin = {
    name: PLUGIN_NAME,
    processOutput: async (output: PluginOutput): Promise<PluginOutput> => {
      if (!output.result?.auth || output.result.auth.length === 0) {
        return output;
      }

      // Step 1: Find the smart account's auth entry
      const entryIndex = Auth.findContractAuthEntryIndex(
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

      // Step 2: Update the smart account entry with signature and expiration
      const expirationLedger = output.latestLedger + 100;
      const signerKey = Signatures.buildDelegatedSignerKey(keypair.publicKey());

      creds.signatureExpirationLedger(expirationLedger);
      creds.signature(Signatures.buildSignaturesValue(signerKey));

      // Step 3: Compute the payload hash for __check_auth
      const payloadHash = Auth.computeAuthPayloadHash(
        networkId,
        nonce,
        expirationLedger,
        rootInvocation
      );

      // Step 4: Build and sign the __check_auth entry
      const checkAuthInvocation = Auth.buildCheckAuthInvocation(
        smartAccountId,
        payloadHash
      );
      const unsignedEntry = Auth.buildUnsignedAuthEntry(
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

      // Step 5: Update footprint with required ledger keys
      const signedNonce = signedEntry.credentials().address().nonce();
      const readOnlyKeys = [
        LedgerKeys.createAccountKey(keypair),
        ...LedgerKeys.createSmartAccountStorageKeys(smartAccountId),
      ];
      const readWriteKeys = [
        LedgerKeys.createNonceKey(keypair.publicKey(), signedNonce),
      ];

      // Step 6: Build updated resources and transaction data
      const currentData = output.transactionData.build();
      const newResources = Resources.buildUpdatedResources(
        currentData.resources(),
        readOnlyKeys,
        readWriteKeys,
        extraInstructions,
        extraReadBytes,
        extraWriteBytes
      );
      const { transactionData, resourceFee } =
        Resources.buildUpdatedTransactionData(currentData, newResources);

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

  return plugin;
};

export const PLG_DelegatedSigner = {
  create,
  name: PLUGIN_NAME,
  target: P_SimulateTransaction().name,
};
