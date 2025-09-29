import { jsonTypeArray, jsonTypeObject, jsonTypeString } from "../data/json";
import { Commitment, PublicKey } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpFindProgramAccountsAddresses(
  rpcHttp: RpcHttp,
  programAddress: PublicKey,
  context?: {
    commitment?: Commitment;
  },
): Promise<Set<PublicKey>> {
  const result = resultJsonType.decode(
    await rpcHttp("getProgramAccounts", [
      programAddress,
      {
        commitment: context?.commitment,
        dataSlice: { offset: 0, length: 0 },
        encoding: "base64",
      },
    ]),
  );
  const accountsAddresses = new Set<PublicKey>();
  for (const item of result) {
    accountsAddresses.add(item.pubkey);
  }
  return accountsAddresses;
}

const resultJsonType = jsonTypeArray(
  jsonTypeObject({
    pubkey: jsonTypeString(),
  }),
);
