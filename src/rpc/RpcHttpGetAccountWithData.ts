import { base64Decode } from "../data/Base64";
import {
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonCodecString,
  jsonDecoderArrayToObject,
  jsonDecoderConst,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { Pubkey, pubkeyDefault, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

/** Fetches owner, lamports, and data bytes of an account. */
export async function rpcHttpGetAccountWithData(
  self: RpcHttp,
  accountAddress: Pubkey,
): Promise<{
  programAddress: Pubkey;
  accountExecutable: boolean;
  accountLamports: bigint;
  accountData: Uint8Array;
}> {
  const result = resultJsonDecoder(
    await self("getAccountInfo", [pubkeyToBase58(accountAddress)], {
      encoding: "base64",
    }),
  );
  if (result.value === null) {
    return {
      programAddress: pubkeyDefault,
      accountExecutable: false,
      accountLamports: 0n,
      accountData: new Uint8Array(0),
    };
  }
  const value = result.value;
  const programAddress = value.owner;
  const accountExecutable = value.executable;
  const accountLamports = BigInt(value.lamports);
  const accountData = base64Decode(value.data.encoded);
  if (accountData.length != value.space) {
    throw new Error(
      `RpcHttp: Expected account data length (${accountData.length}) to match space (${value.space})`,
    );
  }
  return {
    programAddress,
    accountExecutable,
    accountLamports,
    accountData,
  };
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  value: jsonDecoderNullable(
    jsonDecoderObjectToObject({
      executable: jsonCodecBoolean.decoder,
      lamports: jsonCodecNumber.decoder,
      owner: jsonCodecPubkey.decoder,
      data: jsonDecoderArrayToObject({
        encoded: jsonCodecString.decoder,
        encoding: jsonDecoderConst("base64"),
      }),
      space: jsonCodecNumber.decoder,
    }),
  ),
});
