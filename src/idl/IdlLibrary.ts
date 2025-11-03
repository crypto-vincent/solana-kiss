import { inflate } from "uzip";
import {
  jsonCodecBytesArray,
  jsonCodecObjectWithKeysSnakeEncoded,
  jsonCodecPubkey,
  JsonValue,
} from "../data/Json";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { utf8Decode } from "../data/Utf8";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

export type IdlLibraryLoader = (programAddress: Pubkey) => Promise<IdlProgram>;

export class IdlLibrary {
  private readonly loaders: Array<IdlLibraryLoader>;
  private readonly cache: Map<Pubkey, IdlProgram | undefined>;

  constructor(loaders: Array<IdlLibraryLoader>) {
    this.loaders = loaders;
    this.cache = new Map();
  }

  // TODO (error) - should this return errors or undefined on failure to load ?
  public async getOrLoadProgramIdl(
    programAddress: Pubkey,
  ): Promise<IdlProgram | undefined> {
    if (this.cache.has(programAddress)) {
      return this.cache.get(programAddress);
    }
    for (const loader of this.loaders) {
      try {
        const programIdl = await loader(programAddress);
        this.cache.set(programAddress, programIdl);
        return programIdl;
      } catch (_error) {
        // TODO (error) - should this be an error combined instead ?
      }
    }
    this.cache.set(programAddress, undefined);
    return undefined;
  }
}

export function idlLibraryLoaderHttp(
  urlBuilder: (programAddress: Pubkey) => string,
  customFetcher?: (url: string) => Promise<JsonValue>,
): IdlLibraryLoader {
  const fetcher =
    customFetcher ??
    (async (url) => {
      const response = await fetch(url);
      return (await response.json()) as JsonValue;
    });
  return async (programAddress: Pubkey) => {
    const httpJson = await fetcher(urlBuilder(programAddress));
    const httpProgramIdl = idlProgramParse(httpJson as JsonValue);
    httpProgramIdl.metadata.address = programAddress;
    return httpProgramIdl;
  };
}

export function idlLibraryLoaderOnchain(
  accountDataFetcher: (address: Pubkey) => Promise<Uint8Array>,
): IdlLibraryLoader {
  return async (programAddress: Pubkey) => {
    const onchainAnchorAddress = pubkeyCreateFromSeed(
      pubkeyFindPdaAddress(programAddress, []),
      "anchor:idl",
      programAddress,
    );
    const onchainAnchorData = await accountDataFetcher(onchainAnchorAddress);
    const onchainAnchorContent = onchainAnchorJsonCodec.decoder(
      idlAccountDecode(onchainAnchorAccountIdl, onchainAnchorData),
    );
    const onchainAnchorBytes = inflate(onchainAnchorContent.deflatedJson);
    const onchainAnchorString = utf8Decode(onchainAnchorBytes);
    const onchainAnchorJson = JSON.parse(onchainAnchorString) as JsonValue;
    const onchainAnchorIdl = idlProgramParse(onchainAnchorJson);
    onchainAnchorIdl.metadata.address = onchainAnchorAddress;
    onchainAnchorIdl.accounts.set(
      onchainAnchorAccountIdl.name,
      onchainAnchorAccountIdl,
    );
    return onchainAnchorIdl;
  };
}

const onchainAnchorAccountIdl = idlAccountParse("anchor:idl", {
  discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
  fields: [
    { name: "authority", type: "pubkey" },
    { name: "deflated_json", type: { vec32: "u8" } },
  ],
});

const onchainAnchorJsonCodec = jsonCodecObjectWithKeysSnakeEncoded({
  authority: jsonCodecPubkey,
  deflatedJson: jsonCodecBytesArray,
});
