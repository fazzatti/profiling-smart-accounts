import { LocalSigner, StellarAssetContract } from "@colibri/core";
import { config } from "./config/settings.ts";
import { SettingsBasic } from "./config/settings.types.ts";
import { readFromJsonFile } from "./utils/io.ts";
import { BasicAccount } from "./contracts/basic-account/index.ts";
import { Address, nativeToScVal } from "stellar-sdk";

const { networkConfig, ioConfig } = config;
const settings = await readFromJsonFile<SettingsBasic>(ioConfig.settingsBasic);

const { adminSk, johnSk, accountSignerSk, accountId } = settings;

const john = LocalSigner.fromSecret(johnSk);
const signer = LocalSigner.fromSecret(accountSignerSk);
const admin = LocalSigner.fromSecret(adminSk);

const amount = 100_0000000n;

const SAC = StellarAssetContract.NativeXLM(networkConfig);

const account = new BasicAccount(accountId);
await account.loadSpecFromWasm();

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
      signers: [admin, signer],
    },
  })
  //   await SAC.transfer({
  //   from: account.getContractId(),
  //   to: john.publicKey(),
  //   amount,
  //   config: {
  //     source: admin.publicKey(),
  //     fee: "10000",
  //     timeout: 45,
  //     signers: [admin, signer],
  //   },
  // })
  .catch((err) => {
    console.error("Transfer failed:", err.meta.data.input.transaction.toXDR());
    throw err;
  });

console.log("Mint transaction result:", result.hash);
