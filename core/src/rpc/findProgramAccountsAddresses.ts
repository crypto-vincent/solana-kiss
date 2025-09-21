import {
  jsonExpectArrayFromObject,
  jsonExpectObject,
  jsonExpectStringFromObject,
} from "../json";
import { RpcHttp } from "../rpc";
import { Commitment, PublicKey, Slot } from "../types";

export async function findProgramAccountsAddresses(
  rpcHttp: RpcHttp,
  programAddress: PublicKey,
  context?: {
    commitment?: Commitment;
    minSlot?: Slot;
  },
): Promise<Set<PublicKey>> {
  const result = jsonExpectObject(
    await rpcHttp("getProgramAccounts", [
      programAddress,
      {
        commitment: context?.commitment,
        minContextSlot: context?.minSlot,
        dataSlice: { offset: 0, length: 0 },
        encoding: "base64",
        withContext: true,
      },
    ]),
  );
  const accountsAddresses = new Set<PublicKey>();
  for (const item of jsonExpectArrayFromObject(result, "value")) {
    accountsAddresses.add(
      jsonExpectStringFromObject(jsonExpectObject(item), "pubkey"),
    );
  }
  return accountsAddresses;
}
