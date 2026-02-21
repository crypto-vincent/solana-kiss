import { jsonCodecNumber, jsonDecoderObjectToObject } from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches the lamport balance of the given account.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param accountAddress - The account whose balance to query.
 * @returns An object containing `accountLamports`, the account's balance as a `bigint`.
 */
export async function rpcHttpGetAccountLamports(
  self: RpcHttp,
  accountAddress: Pubkey,
): Promise<{
  accountLamports: bigint;
}> {
  const result = resultJsonDecoder(
    await self("getBalance", [pubkeyToBase58(accountAddress)], undefined),
  );
  return { accountLamports: BigInt(result.value) };
}

const resultJsonDecoder = jsonDecoderObjectToObject({
  value: jsonCodecNumber.decoder,
});
