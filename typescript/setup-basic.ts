import {
  Ed25519PublicKey,
  Ed25519SecretKey,
  initializeWithFriendbot,
  LocalSigner,
  StellarAssetContract,
} from "@colibri/core";
import { config } from "./config/settings.ts";
import { Keypair } from "stellar-sdk";
import { saveToJsonFile } from "./utils/io.ts";
import { SettingsBasic } from "./config/settings.types.ts";

import { Methods, Payload } from "./contracts/basic-account/types.ts";
import {
  BasicAccount,
  createDelegatedSigner,
} from "./contracts/basic-account/index.ts";

const { networkConfig, ioConfig } = config;

const adminSk = Keypair.random().secret() as Ed25519SecretKey;
const accountSignerKeys = Keypair.random();
const johnKeys = Keypair.random();
const admin = LocalSigner.fromSecret(adminSk);
const temporary = LocalSigner.generateRandom();

console.log("Initializing acounts...");

await initializeWithFriendbot(
  networkConfig.friendbotUrl,
  accountSignerKeys.publicKey() as Ed25519PublicKey
);
console.log("Account Signer initialized: ", accountSignerKeys.publicKey());
await initializeWithFriendbot(networkConfig.friendbotUrl, admin.publicKey());

console.log("Admin initialized: ", admin.publicKey());

await initializeWithFriendbot(
  networkConfig.friendbotUrl,
  johnKeys.publicKey() as Ed25519PublicKey
);
console.log("User initialized: ", johnKeys.publicKey());

await initializeWithFriendbot(
  networkConfig.friendbotUrl,
  temporary.publicKey()
);
console.log("Temporary initialized: ", temporary.publicKey());

console.log("Setting up user account...");

const accountContract = new BasicAccount();
await accountContract.loadSpecFromWasm();

// Upload the WASM ofr the
// Basic Account contract
{
  console.log("Uploading Basic Account contract WASM...");
  const result = await accountContract.uploadWasm({
    source: admin.publicKey(),
    fee: "10000",
    timeout: 45,
    signers: [admin],
  });

  console.log("Basic Account contract WASM uploaded:", result.hash);
}

// Deploy a new instance of the
// Basic Account contract
{
  console.log("Deploying Basic Account contract...");

  const result = await accountContract
    .deploy<Payload[Methods.Constructor]>({
      constructorArgs: {
        signers: [
          createDelegatedSigner(
            accountSignerKeys.publicKey() as Ed25519PublicKey
          ),
        ],
        policies: new Map(),
      },
      config: {
        source: admin.publicKey(),
        fee: "10000",
        timeout: 45,
        signers: [admin],
      },
    })
    .catch((error) => {
      console.error("Error deploying Basic Account contract:", error);
      throw error;
    });

  console.log("Basic Account contract instantiated:", result.hash);
}

{
  console.log("Adding funds to the smart wallet...");

  const SAC = StellarAssetContract.NativeXLM(networkConfig);

  const result = await SAC.transfer({
    from: temporary.publicKey(),
    to: accountContract.getContractId(),
    amount: BigInt(9000_0000000), // 9k XLM
    config: {
      source: temporary.publicKey(),
      fee: "10000",
      timeout: 45,
      signers: [temporary],
    },
  });

  console.log("Funds transfer transaction hash:", result.hash);
}

console.log("Saving Setup...");
await saveToJsonFile<SettingsBasic>(
  {
    adminSk: adminSk,
    johnSk: johnKeys.secret() as Ed25519SecretKey,
    accountSignerSk: accountSignerKeys.secret() as Ed25519SecretKey,
    accountId: accountContract.getContractId(),
  },
  ioConfig.settingsBasic
);
