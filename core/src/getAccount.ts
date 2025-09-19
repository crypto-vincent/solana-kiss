import {
  jsonExpectArrayFromObject,
  jsonExpectBooleanFromObject,
  jsonExpectNumberFromObject,
  jsonExpectObject,
  jsonExpectObjectFromObject,
  jsonExpectStringFromArray,
  jsonExpectStringFromObject,
} from "./json";
import { base64Decode } from "./math/base64";
import { RpcHttp } from "./rpc";
import { Commitment, Lamports, PublicKey, Slot } from "./types";

export async function getAccount(
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
  data: Uint8Array;
}> {
  const result = jsonExpectObject(
    await rpcHttp("getAccountInfo", [
      accountAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        encoding: "base64",
      },
    ]),
  );
  const value = jsonExpectObjectFromObject(result, "value");
  const executable = jsonExpectBooleanFromObject(value, "executable");
  const lamports = String(jsonExpectNumberFromObject(value, "lamports"));
  const owner = jsonExpectStringFromObject(value, "owner");
  const data = base64Decode(
    jsonExpectStringFromArray(jsonExpectArrayFromObject(value, "data"), 0),
  );
  return {
    executable,
    lamports,
    owner,
    data,
  };
}
