import { base58Encode } from "../data/Base58";
import {
  jsonDecoderArray,
  jsonDecoderObject,
  jsonDecodeString,
} from "../data/Json";
import { Pubkey } from "../data/Pubkey";
import { RpcHttp } from "./RpcHttp";
import { Commitment } from "./RpcTypes";

// TODO - naming: find Owned accounts ?
export async function rpcHttpFindProgramOwnedAddresses(
  rpcHttp: RpcHttp,
  programAddress: Pubkey,
  filters?: {
    dataSize?: number;
    dataBlobs?: Array<{
      offset: number;
      bytes: Uint8Array;
    }>;
  },
  context?: {
    commitment?: Commitment;
  },
): Promise<Set<Pubkey>> {
  const paramFilters = [];
  if (filters?.dataSize !== undefined) {
    paramFilters.push({ dataSize: filters.dataSize });
  }
  if (filters?.dataBlobs !== undefined) {
    for (const dataBlob of filters.dataBlobs) {
      paramFilters.push({
        memcmp: {
          offset: dataBlob.offset,
          bytes: base58Encode(dataBlob.bytes),
        },
      });
    }
  }
  if (paramFilters.length > 4) {
    throw new Error("RpcHttp: Too many filters, max is 4");
  }
  const result = resultDecode(
    await rpcHttp("getProgramAccounts", [
      programAddress,
      {
        commitment: context?.commitment,
        filters: paramFilters.length > 0 ? paramFilters : undefined,
        dataSlice: { offset: 0, length: 0 },
        encoding: "base64",
      },
    ]),
  );
  const accountsAddresses = new Set<Pubkey>();
  for (const item of result) {
    accountsAddresses.add(item.pubkey);
  }
  return accountsAddresses;
}

const resultDecode = jsonDecoderArray(
  jsonDecoderObject({ pubkey: jsonDecodeString }),
);
