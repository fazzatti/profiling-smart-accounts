/**
 * Soroban transaction data helpers for updating resources and fees.
 */
import { xdr, SorobanDataBuilder } from "stellar-sdk";

/**
 * Builds updated soroban resources with additional footprint entries and bumped limits.
 */
export function buildUpdatedResources(
  currentResources: xdr.SorobanResources,
  additionalReadOnly: xdr.LedgerKey[],
  additionalReadWrite: xdr.LedgerKey[],
  extraInstructions: number,
  extraReadBytes: number,
  extraWriteBytes: number
): xdr.SorobanResources {
  const currentFootprint = currentResources.footprint();

  const newFootprint = new xdr.LedgerFootprint({
    readOnly: [...currentFootprint.readOnly(), ...additionalReadOnly],
    readWrite: [...currentFootprint.readWrite(), ...additionalReadWrite],
  });

  return new xdr.SorobanResources({
    footprint: newFootprint,
    instructions: currentResources.instructions() + extraInstructions,
    diskReadBytes: currentResources.diskReadBytes() + extraReadBytes,
    writeBytes: currentResources.writeBytes() + extraWriteBytes,
  });
}

/**
 * Builds updated transaction data with new resources and bumped fees.
 */
export function buildUpdatedTransactionData(
  currentData: xdr.SorobanTransactionData,
  newResources: xdr.SorobanResources,
  feeMultiplier: bigint = 3n
): { transactionData: SorobanDataBuilder; resourceFee: string } {
  const currentFee = BigInt(currentData.resourceFee().toString());
  const newFee = currentFee * feeMultiplier;

  const newData = new xdr.SorobanTransactionData({
    ext: currentData.ext(),
    resources: newResources,
    resourceFee: xdr.Int64.fromString(newFee.toString()),
  });

  return {
    transactionData: new SorobanDataBuilder(newData.toXDR()),
    resourceFee: newFee.toString(),
  };
}
