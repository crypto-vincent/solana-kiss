import { jsonTypeArray, jsonTypeObject, jsonTypeString } from "../data/json";
import { Pubkey } from "../data/pubkey";
import { Commitment } from "../types";
import { RpcHttp } from "./rpcHttp";

// TODO - naming: find Owned accounts ?
export async function rpcHttpFindProgramAccountsAddresses(
  rpcHttp: RpcHttp,
  programAddress: Pubkey,
  // TODO - support filters
  context?: {
    commitment?: Commitment;
  },
): Promise<Set<Pubkey>> {
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
  const accountsAddresses = new Set<Pubkey>();
  for (const item of result) {
    accountsAddresses.add(item.pubkey);
  }
  return accountsAddresses;
}

const resultJsonType = jsonTypeArray(
  jsonTypeObject({ pubkey: jsonTypeString() }),
);
