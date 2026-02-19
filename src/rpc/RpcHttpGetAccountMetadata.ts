import {
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { Pubkey, pubkeyDefault, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

/** Fetches owner, lamports, space, and executable flag of an account. */
export async function rpcHttpGetAccountMetadata(
  self: RpcHttp,
  accountAddress: Pubkey,
): Promise<{
  programAddress: Pubkey;
  accountExecutable: boolean;
  accountLamports: bigint;
  accountSpace: number;
}> {
  const result = resultJsonDecoder(
    await self("getAccountInfo", [pubkeyToBase58(accountAddress)], {
      dataSlice: { offset: 0, length: 0 },
      encoding: "base64",
    }),
  );
  if (result.value === null) {
    return {
      programAddress: pubkeyDefault,
      accountExecutable: false,
      accountLamports: 0n,
      accountSpace: 0,
    };
  }
  const value = result.value;
  const programAddress = value.owner;
  const accountExecutable = value.executable;
  const accountLamports = BigInt(value.lamports);
  const accountSpace = value.space;
  return {
    programAddress,
    accountExecutable,
    accountLamports,
    accountSpace,
  };
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  value: jsonDecoderNullable(
    jsonDecoderObjectToObject({
      executable: jsonCodecBoolean.decoder,
      lamports: jsonCodecNumber.decoder,
      owner: jsonCodecPubkey.decoder,
      space: jsonCodecNumber.decoder,
    }),
  ),
});
