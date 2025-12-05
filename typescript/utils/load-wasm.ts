import { readFile } from "node:fs/promises";
import { config } from "../config/settings.ts";
import type { Buffer } from "buffer";
export const loadWasmFile = async (wasmFile: string): Promise<Buffer> => {
  try {
    const dir = config.wasmDir;
    const wasmFilePath = `${dir}${wasmFile}`;
    const buffer = await readFile(wasmFilePath);
    return buffer as unknown as Buffer;
  } catch (error) {
    console.error(`Error reading the WASM file: ${error}`);
    throw error;
  }
};
