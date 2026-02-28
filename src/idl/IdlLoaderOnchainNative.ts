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
  JsonValue,
} from "../data/Json";
import {
  Pubkey,
  pubkeyFindPdaAddress,
  pubkeyFromBase58,
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
 * @returns A new {@link IdlLoader} backed by on-chain native IDL storage.
 */
export function idlLoaderFromOnchainNative(
  accountDataFetcher: (accountAddress: Pubkey) => Promise<Uint8Array>,
): IdlLoader {
  return async (programAddress: Pubkey) => {
    const idlAddress = pubkeyFindPdaAddress(metadataProgramAddress, [
      pubkeyToBytes(programAddress),
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
    if (idlContent.encoding !== "Utf8") {
      throw new ErrorStack(`IDL: Unsupported encoding ${idlContent.encoding}`);
    }
    if (idlContent.format !== "None" && idlContent.format !== "Json") {
      throw new ErrorStack(`IDL: Unsupported format ${idlContent.format}`);
    }
    // TODO - improve support for other formats and compression and encoding
    // TODO - handle account/url/text data sources for example
    const idlBytes = await extractMetadataIdlBytes(idlContent);
    const idlString = utf8Decode(idlBytes);
    const idlJson = JSON.parse(idlString) as JsonValue;
    const programIdl = idlProgramParse(idlJson);
    programIdl.metadata.address = programAddress;
    // TODO - more standardized program metadata and source
    programIdl.metadata.source = `onchain://solana-program-metadata/canonical`;
    return programIdl;
  };
}

async function extractMetadataIdlBytes(
  idlContent: JsonCodecContent<typeof metadataProgramJsonCodec>,
): Promise<Uint8Array> {
  // TODO - support indirect loading
  if (idlContent.dataSource !== "Direct") {
    throw new ErrorStack(
      `IDL: Unsupported data source ${idlContent.dataSource}`,
    );
  }
  const idlBytes = idlContent.dataRaw.slice(0, idlContent.dataLength);
  if (idlContent.compression === "ZLib") {
    return inflate(idlBytes, null);
  }
  if (idlContent.compression === "None") {
    return idlBytes;
  }
  throw new ErrorStack(
    `IDL: Unsupported compression ${idlContent.compression}`,
  );
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
        padded: {
          before: 5,
          loop: { items: "u8", stop: "end" },
        },
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
