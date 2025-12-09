import { LocalSigner, StellarAssetContract } from "@colibri/core";
import { config } from "./config/settings.ts";
import { SettingsBasic } from "./config/settings.types.ts";
import { readFromJsonFile } from "./utils/io.ts";
import { BasicAccount } from "./contracts/basic-account/index.ts";
import { Address, nativeToScVal } from "stellar-sdk";
import { PLG_DelegatedSigner } from "./smart-accounts/plugins/delegated-signer.ts";

const { networkConfig, ioConfig } = config;
const settings = await readFromJsonFile<SettingsBasic>(ioConfig.settingsBasic);

const { adminSk, johnSk, accountSignerSk, accountId } = settings;

const john = LocalSigner.fromSecret(johnSk);
const accountSigner = LocalSigner.fromSecret(accountSignerSk);
const admin = LocalSigner.fromSecret(adminSk);

const amount = 100_0000000n;

const SAC = StellarAssetContract.NativeXLM(networkConfig);

// Create account instance
const account = new BasicAccount(accountId);
await account.loadSpecFromWasm();

// Add the delegated signer plugin directly to the pipeline
const plugin = PLG_DelegatedSigner.create({
  smartAccountId: accountId,
  signer: accountSigner,
  networkPassphrase: networkConfig.networkPassphrase,
});

account.invokePipe.addPlugin(plugin, PLG_DelegatedSigner.target);

console.log(`> Transfer 
   - ${amount} XLM(stroops)  
   - from: ${account.getContractId()}
   - to: ${john.publicKey()}
`);

const result = await account
  .execute({
    contractAddress: SAC.contractId,
    functionName: "transfer",
    args: [
      nativeToScVal(new Address(account.getContractId())),
      nativeToScVal(new Address(john.publicKey())),
      nativeToScVal(amount, { type: "i128" }),
    ],
    config: {
      source: admin.publicKey(),
      fee: "10000",
      timeout: 45,
      signers: [admin], // Plugin handles delegated signer auth internally
    },
  })
  .catch((err) => {
    console.error("Transfer failed!");
    console.error("Error message:", err.message || err);
    if (err.meta?.data?.input?.transaction) {
      console.error(
        "Transaction XDR:",
        err.meta.data.input.transaction.toXDR()
      );
    }
    throw err;
  });

console.log("Transfer transaction result:", result?.hash);
