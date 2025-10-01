import { base64Decode } from "../data/Base64";
import {
  jsonTypeArrayToTuple,
  jsonTypeBoolean,
  jsonTypeConst,
  jsonTypeNullable,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeString,
} from "../data/Json";
import { Lamports } from "../data/Lamports";
import { Pubkey, pubkeyDefault } from "../data/Pubkey";
import { Commitment } from "../types";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpGetAccountWithData(
  rpcHttp: RpcHttp,
  accountAddress: Pubkey,
  context?: {
    commitment?: Commitment;
  },
): Promise<{
  executable: boolean;
  lamports: Lamports;
  owner: Pubkey;
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
  if (result.value === null) {
    return {
      executable: false,
      lamports: 0n,
      owner: pubkeyDefault(),
      data: new Uint8Array(0),
    };
  }
  const value = result.value;
  const executable = value.executable;
  const lamports = BigInt(value.lamports);
  const owner = value.owner;
  const data = base64Decode(value.data[0]!);
  if (data.length != value.space) {
    throw new Error(
      `RpcHttp: Expected account data length (${data.length}) to match space (${value.space})`,
    );
  }
  return { executable, lamports, owner, data };
}

const resultJsonType = jsonTypeObject({
  value: jsonTypeNullable(
    jsonTypeObject({
      executable: jsonTypeBoolean(),
      lamports: jsonTypeNumber(),
      owner: jsonTypeString(),
      data: jsonTypeArrayToTuple([jsonTypeString(), jsonTypeConst("base64")]),
      space: jsonTypeNumber(),
    }),
  ),
});
