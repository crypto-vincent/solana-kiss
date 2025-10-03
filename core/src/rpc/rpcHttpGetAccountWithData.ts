import { base64Decode } from "../data/Base64";
import {
  jsonDecoderArrayToTuple,
  jsonDecoderConst,
  jsonDecoderNullable,
  jsonDecoderObject,
  jsonExpectBoolean,
  jsonExpectNumber,
  jsonExpectString,
} from "../data/Json";
import { Lamports } from "../data/Lamports";
import { Commitment } from "../data/Onchain";
import { Pubkey, pubkeyDefault } from "../data/Pubkey";
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
  const result = resultDecode(
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

const resultDecode = jsonDecoderObject({
  value: jsonDecoderNullable(
    jsonDecoderObject({
      executable: jsonExpectBoolean,
      lamports: jsonExpectNumber,
      owner: jsonExpectString,
      data: jsonDecoderArrayToTuple([
        jsonExpectString,
        jsonDecoderConst("base64"),
      ]),
      space: jsonExpectNumber,
    }),
  ),
});
