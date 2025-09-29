import {
  jsonTypeBoolean,
  jsonTypeNullableToOptional,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeString,
} from "../data/json";
import { pubkeyDefault } from "../data/pubkey";
import { Commitment, Lamports, PublicKey } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpGetAccountMetadata(
  rpcHttp: RpcHttp,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: PublicKey;
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
  if (result.value === undefined) {
    return {
      executable: false,
      lamports: "0",
      owner: pubkeyDefault(),
      space: 0,
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = String(value.lamports);
  const owner = value.owner;
  const space = value.space;
  return {
    executable,
    lamports,
    owner,
    space,
  };
}

const resultJsonType = jsonTypeObject({
  value: jsonTypeNullableToOptional(
    jsonTypeObject({
      executable: jsonTypeBoolean(),
      lamports: jsonTypeNumber(),
      owner: jsonTypeString(),
      space: jsonTypeNumber(),
    }),
  ),
});
