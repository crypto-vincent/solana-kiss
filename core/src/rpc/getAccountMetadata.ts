import {
  jsonExpectBooleanFromObject,
  jsonExpectNumberFromObject,
  jsonExpectObject,
  jsonExpectObjectFromObject,
  jsonExpectStringFromObject,
} from "../json";
import { RpcHttp } from "../rpc";
import { Commitment, Lamports, PublicKey, Slot } from "../types";

export async function getAccountMetadata(
  rpcHttp: RpcHttp,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: PublicKey;
  space: number;
}> {
  const result = jsonExpectObject(
    await rpcHttp("getAccountInfo", [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        dataSlice: { offset: 0, length: 0 },
        encoding: "base64",
      },
    ]),
  );
  const value = jsonExpectObjectFromObject(result, "value");
  const executable = jsonExpectBooleanFromObject(value, "executable");
  const lamports = String(jsonExpectNumberFromObject(value, "lamports"));
  const owner = jsonExpectStringFromObject(value, "owner");
  const space = jsonExpectNumberFromObject(value, "space");
  return {
    executable,
    lamports,
    owner,
    space,
  };
}
