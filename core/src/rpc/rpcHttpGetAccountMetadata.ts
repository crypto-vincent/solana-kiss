import {
  jsonTypeBoolean,
  jsonTypeNullable,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeString,
} from "../data/json";
import { Pubkey, pubkeyDefault } from "../data/pubkey";
import { Commitment, Lamports } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpGetAccountMetadata(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: Pubkey;
  space: number;
}> {
  const result = resultJsonType.decode(
    await rpcHttp("getAccountInfo", [
      accountAddress,
      {
        commitment: context?.commitment,
        dataSlice: { offset: 0, length: 0 },
        encoding: "base64",
      },
    ]),
  );
  if (result.value === null) {
    return {
      executable: false,
      lamports: 0n,
      owner: pubkeyDefault(),
      space: 0,
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = String(value.lamports);
  const owner = value.owner;
  const space = value.space;
  return { executable, lamports, owner, space };
}

const resultJsonType = jsonTypeObject({
  value: jsonTypeNullable(
    jsonTypeObject({
      executable: jsonTypeBoolean(),
      lamports: jsonTypeNumber(),
      owner: jsonTypeString(),
      space: jsonTypeNumber(),
    }),
  ),
});
