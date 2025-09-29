import { base64Decode } from "../data/base64";
import {
  jsonTypeArray,
  jsonTypeBoolean,
  jsonTypeNullableToOptional,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeString,
} from "../data/json";
import { pubkeyDefault } from "../data/pubkey";
import { Commitment, Lamports, PublicKey } from "../types";
import { RpcHttp } from "./rpcHttp";

export async function rpcHttpGetAccount(
  rpcHttp: RpcHttp,
  accountAddress: PublicKey,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: PublicKey;
  data: Uint8Array;
}> {
  const result = resultJsonType.decode(
    await rpcHttp("getAccountInfo", [
      accountAddress,
      {
        commitment: context?.commitment,
        encoding: "base64",
      },
    ]),
  );
  if (result.value === undefined) {
    return {
      executable: false,
      lamports: "0",
      owner: pubkeyDefault(),
      data: new Uint8Array(0),
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = String(value.lamports);
  const owner = value.owner;
  const data = base64Decode(value.data[0]!); // TODO - use tuple type parsing
  return {
    executable,
    lamports,
    owner,
    data,
  };
}

const resultJsonType = jsonTypeObject({
  value: jsonTypeNullableToOptional(
    jsonTypeObject({
      executable: jsonTypeBoolean(),
      lamports: jsonTypeNumber(),
      owner: jsonTypeString(),
      data: jsonTypeArray(jsonTypeString()),
    }),
  ),
});
