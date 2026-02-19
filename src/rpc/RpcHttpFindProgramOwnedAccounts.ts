import { base58Encode } from "../data/Base58";
import {
  jsonCodecPubkey,
  jsonDecoderArrayToArray,
  jsonDecoderObjectToObject,
} from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

// TODO - expose lamport and space info per account
/**
 * Fetches the set of all account addresses owned by the given program.
 *
 * Optionally filters results by account data size or byte-level memory patterns.
 *
 * @param self - The {@link RpcHttp} client to use.
 * @param programAddress - The program whose owned accounts to find.
 * @param filters - Optional filters to narrow down results.
 * @param filters.dataSpace - Only return accounts whose data length equals this value (in bytes).
 * @param filters.dataBlobs - Only return accounts that match all given byte patterns at the specified offsets.
 * @returns An object containing `accountsAddresses`, a set of matching account public keys.
 * @throws If more than 4 filter entries are provided (Solana RPC limit).
 * @throws If any filter blob has a negative offset.
 */
export async function rpcHttpFindProgramOwnedAccounts(
  self: RpcHttp,
  programAddress: Pubkey,
  filters?: {
    dataSpace?: number | undefined;
    dataBlobs?: Array<{ offset: number; bytes: Uint8Array }> | undefined;
  },
): Promise<{ accountsAddresses: Set<Pubkey> }> {
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
  const accountsAddresses = new Set<Pubkey>();
  for (const item of result) {
    accountsAddresses.add(item.pubkey);
  }
  return { accountsAddresses };
}

const resultJsonDecoder = jsonDecoderArrayToArray(
  jsonDecoderObjectToObject({ pubkey: jsonCodecPubkey.decoder }),
);
