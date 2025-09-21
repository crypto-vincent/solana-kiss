import {
  jsonExpectObject,
  jsonExpectObjectFromObject,
  jsonExpectStringFromObject,
} from "../json";
import { RpcHttp } from "../rpc";
import { Commitment, Hash, Slot } from "../types";

export async function getLatestBlockHash(
  rpcHttp: RpcHttp,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot; // TODO - check the context params are valid in all cases
  },
): Promise<Hash> {
  const result = jsonExpectObject(
    await rpcHttp("getLatestBlockhash", [
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
      },
    ]),
  );
  const value = jsonExpectObjectFromObject(result, "value");
  return jsonExpectStringFromObject(value, "blockhash");
}
