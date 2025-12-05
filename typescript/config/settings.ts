import { NetworkConfig } from "@colibri/core";

export const config = {
  wasmDir: "./target/wasm32v1-none/release/",
  basicAccountWasmFile: "basic_account.optimized.wasm",
  networkConfig: NetworkConfig.TestNet(),
  ioConfig: {
    outputDirectory: "./.json",
    settingsBasic: "settings-basic",
  },
};
