import { URL } from "url";
import { ErrorStack } from "../data/Error";
import { inflate } from "../data/Inflate";
import {
  jsonCodecArrayToBytes,
  jsonCodecBoolean,
  JsonCodecContent,
  jsonCodecNumber,
  jsonCodecObjectToObject,
  jsonCodecPubkey,
  jsonCodecString,
  JsonFetcher,
  jsonFetcherDefault,
  JsonValue,
} from "../data/Json";
import {
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
  pubkeyFromBytes,
  pubkeyToBytes,
} from "../data/Pubkey";
import { utf8Decode, utf8Encode } from "../data/Utf8";
import { bytesCompare } from "../data/Utils";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { IdlLoader } from "./IdlLoader";
import { idlProgramParse } from "./IdlProgram";

/**
 * Creates an {@link IdlLoader} that fetches a program's IDL from on-chain
 * storage via the Solana Program Metadata program. It derives the metadata PDA
 * using the program address and `idl` seed, decodes the account, validates the
 * seed and format, optionally decompresses the payload, then parses the result
 * as an {@link IdlProgram}.
 * @param accountDataFetcher - A function that fetches raw account data by address.
 * @param params - Optional parameters for handling non-canonical authority addresses and custom JSON fetching.
 * @param params.nonCanonicalAuthorityAddress - An optional non-canonical authority address to use in the PDA derivation, if the program does not follow the canonical pattern.
 * @param params.customJsonFetcher - An optional custom JSON fetcher function to retrieve IDL JSON from URLs, if needed.
 * @returns A new {@link IdlLoader} backed by on-chain native IDL storage.
 */
export function idlLoaderFromOnchainNative(
  accountDataFetcher: (accountAddress: Pubkey) => Promise<Uint8Array>,
  params?: {
    nonCanonicalAuthorityAddress?: Pubkey;
    customJsonFetcher?: JsonFetcher;
  },
): IdlLoader {
  return async (programAddress: Pubkey) => {
    const idlAddress = pubkeyFindPdaAddress(metadataProgramAddress, [
      pubkeyToBytes(programAddress),
      params?.nonCanonicalAuthorityAddress
        ? pubkeyToBytes(params.nonCanonicalAuthorityAddress)
        : new Uint8Array(0),
      metadataProgramIdlSeed,
    ]);
    const idlData = await accountDataFetcher(idlAddress);
    if (idlData.length === 0) {
      throw new ErrorStack(`IDL: No native idl found at address ${idlAddress}`);
    }
    const { accountState: idlState } = idlAccountDecode(
      metadataProgramAccount,
      idlData,
    );
    const idlContent = metadataProgramJsonCodec.decoder(idlState);
    if (bytesCompare(idlContent.seed, metadataProgramIdlSeed) !== 0) {
      throw new ErrorStack(`IDL: Invalid seed value`);
    }
    if (idlContent.format !== "None" && idlContent.format !== "Json") {
      throw new ErrorStack(`IDL: Unexpected format ${idlContent.format}`);
    }
    const idlJson = await resolveIdlJson(
      idlContent,
      accountDataFetcher,
      params?.customJsonFetcher,
    );
    const programIdl = idlProgramParse(idlJson);
    programIdl.metadata.address = programAddress;
    if (params?.nonCanonicalAuthorityAddress) {
      programIdl.metadata.source = new URL(
        `onchain://solana-program-metadata/authority/${params.nonCanonicalAuthorityAddress}`,
      );
    } else {
      programIdl.metadata.source = new URL(
        `onchain://solana-program-metadata/canonical`,
      );
    }
    return programIdl;
  };
}

async function resolveIdlJson(
  idlContent: JsonCodecContent<typeof metadataProgramJsonCodec>,
  accountDataFetcher: (accountAddress: Pubkey) => Promise<Uint8Array>,
  customJsonFetcher?: JsonFetcher,
): Promise<JsonValue> {
  const directData = idlContent.dataRaw.slice(0, idlContent.dataLength);
  if (idlContent.dataSource === "Direct") {
    const idlBytes = decompressIfNeeded(idlContent.compression, directData);
    const idlString = utf8Decode(idlBytes);
    return JSON.parse(idlString) as JsonValue;
  }
  if (idlContent.dataSource === "External") {
    const externalAddress = pubkeyFromBytes(directData.slice(0, 32));
    const externalDataView = new DataView(directData.buffer);
    const externalOffset = externalDataView.getUint32(32, true);
    const externalLength = externalDataView.getUint32(36, true);
    const externalData = await accountDataFetcher(externalAddress);
    const externalBytes = externalData.slice(
      externalOffset,
      externalLength === 0 ? undefined : externalOffset + externalLength,
    );
    const idlBytes = decompressIfNeeded(idlContent.compression, externalBytes);
    const idlString = utf8Decode(idlBytes);
    return JSON.parse(idlString) as JsonValue;
  }
  if (idlContent.dataSource == "Url") {
    const urlBytes = decompressIfNeeded(idlContent.compression, directData);
    const urlString = utf8Decode(urlBytes);
    return await (customJsonFetcher ?? jsonFetcherDefault)(new URL(urlString));
  }
  throw new ErrorStack(`IDL: Unsupported data source ${idlContent.dataSource}`);
}

function decompressIfNeeded(
  idlCompression: string,
  idlBytes: Uint8Array,
): Uint8Array {
  if (idlCompression === "None") {
    return idlBytes;
  }
  if (idlCompression === "ZLib") {
    return inflate(idlBytes, null);
  }
  throw new ErrorStack(`IDL: Unexpected compression ${idlCompression}`);
}

const metadataProgramAddress = pubkeyFromBase58(
  "ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S",
);

const metadataProgramIdlSeed = (() => {
  const seed = new Uint8Array(16);
  seed.set(utf8Encode("idl"));
  return seed;
})();

const metadataProgramAccount = idlAccountParse(
  "program:metadata",
  {
    discriminator: [2],
    fields: [
      { name: "program", type: "pubkey" },
      { name: "authority", type: "pubkey" },
      { name: "mutable", type: "bool" },
      { name: "canonical", type: "bool" },
      { name: "seed", type: ["u8", 16] },
      { name: "encoding", variants8: ["None", "Utf8", "Base58", "Base64"] },
      { name: "compression", variants8: ["None", "GZip", "ZLib"] },
      { name: "format", variants8: ["None", "Json", "Yaml", "Toml"] },
      { name: "data_source", variants8: ["Direct", "Url", "External"] },
      { name: "data_length", type: "u32" },
      {
        name: "data_raw",
        padded: { before: 5, loop: { items: "u8", stop: "end" } },
      },
    ],
  },
  new Map(),
);

const metadataProgramJsonCodec = jsonCodecObjectToObject({
  program: jsonCodecPubkey,
  authority: jsonCodecPubkey,
  mutable: jsonCodecBoolean,
  canonical: jsonCodecBoolean,
  seed: jsonCodecArrayToBytes,
  encoding: jsonCodecString,
  compression: jsonCodecString,
  format: jsonCodecString,
  dataSource: jsonCodecString,
  dataLength: jsonCodecNumber,
  dataRaw: jsonCodecArrayToBytes,
});
