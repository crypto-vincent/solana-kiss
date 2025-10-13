import { base58Encode } from "../data/Base58";
import {
  jsonCodecPubkey,
  jsonDecoderArray,
  jsonDecoderObject,
} from "../data/Json";
import { Pubkey, pubkeyToBase58 } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";

export async function rpcHttpFindProgramOwnedAccounts(
  rpcHttp: RpcHttp,
  programAddress: Pubkey,
  filters?: {
    dataSpace?: number;
    dataBlobs?: Array<{
      offset: number;
      bytes: Uint8Array;
    }>;
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
    await rpcHttp("getProgramAccounts", [pubkeyToBase58(programAddress)], {
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

const resultJsonDecoder = jsonDecoderArray(
  jsonDecoderObject({
    pubkey: jsonCodecPubkey.decoder,
  }),
);
