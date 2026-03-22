import { base58Encode } from "../data/Base58";
import {
  jsonCodecBoolean,
  jsonCodecNumber,
  jsonCodecPubkey,
  jsonDecoderArrayToArray,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

/**
 * Fetches all account addresses owned by a program. Optionally filters by size or byte patterns.
 * @param self - {@link RpcHttp} client.
 * @param programAddress - Program to query.
 * @param filters.dataSpace - Filter by account data length (bytes).
 * @param filters.dataBlobs - Filter by byte patterns at given offsets.
 * @returns Array of `{ accountAddress, accountExecutable, accountLamports, accountSpace }`.
 * @throws If more than 4 filters or any filter blob has a negative offset.
 */
export async function rpcHttpFindProgramOwnedAccounts(
  self: RpcHttp,
  programAddress: Pubkey,
  filters?: {
    dataSpace?: number | undefined;
    dataBlobs?: Array<{ offset: number; bytes: Uint8Array }> | undefined;
  },
): Promise<
  Array<{
    accountAddress: Pubkey;
    accountExecutable: boolean;
    accountLamports: bigint;
    accountSpace: number;
  }>
> {
  const paramFilters = [];
  if (filters?.dataSpace !== undefined) {
    paramFilters.push({ dataSize: filters.dataSpace });
  }
  if (filters?.dataBlobs !== undefined) {
    for (const dataBlob of filters.dataBlobs) {
      if (dataBlob.offset < 0) {
        throw new Error("RpcHttp: Account data filter offset must be >= 0");
      }
      if (dataBlob.bytes.length === 0) {
        continue;
      }
      paramFilters.push({
        memcmp: {
          offset: dataBlob.offset,
          bytes: base58Encode(dataBlob.bytes),
        },
      });
    }
  }
  if (paramFilters.length > 4) {
    throw new Error("RpcHttp: Too many account data filters, max is 4");
  }
  const result = resultJsonDecoder(
    await self("getProgramAccounts", [pubkeyToBase58(programAddress)], {
      filters: paramFilters.length > 0 ? paramFilters : undefined,
      dataSlice: { offset: 0, length: 0 },
      encoding: "base64",
    }),
  );
  return result.map((item) => ({
    accountAddress: item.pubkey,
    accountExecutable: item.account.executable,
    accountLamports: BigInt(item.account.lamports),
    accountSpace: item.account.space,
  }));
}

const resultJsonDecoder = jsonDecoderArrayToArray(
  jsonDecoderObjectToObject({
    pubkey: jsonCodecPubkey.decoder,
    account: jsonDecoderObjectToObject({
      executable: jsonCodecBoolean.decoder,
      lamports: jsonCodecNumber.decoder,
      space: jsonCodecNumber.decoder,
    }),
  }),
);
