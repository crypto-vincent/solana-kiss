import { inflate } from "uzip";
import {
  jsonCodecBytesArray,
  jsonCodecObject,
  jsonCodecPubkey,
  JsonValue,
} from "../data/Json";
import { memoize } from "../data/Memoize";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { utf8Decode } from "../data/Utf8";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { idlInstructionParse } from "./IdlInstruction";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

export type IdlLoader = (programAddress: Pubkey) => Promise<IdlProgram>;

export function idlLoaderMemoized(loader: IdlLoader): IdlLoader {
  return memoize(loader, async (programAddress) => programAddress);
}

export function idlLoaderFallbackToUnknown(): IdlLoader {
  const instructionIdl = idlInstructionParse("unknown_instruction", {
    discriminator: [],
    accounts: [],
    args: [],
  });
  const accountIdl = idlAccountParse("UnknownAccount", {
    discriminator: [],
    fields: [],
  });
  const eventIdl = idlAccountParse("UnknownEvent", {
    discriminator: [],
    fields: [],
  });
  return async (programAddress: Pubkey) => {
    return {
      metadata: {
        name: undefined,
        description: undefined,
        repository: undefined,
        contact: undefined,
        address: programAddress,
        version: undefined,
        source: "unknown",
        spec: undefined,
        docs: undefined,
      },
      typedefs: new Map(),
      accounts: new Map([[accountIdl.name, accountIdl]]),
      instructions: new Map([[instructionIdl.name, instructionIdl]]),
      events: new Map([[eventIdl.name, eventIdl]]),
      errors: new Map(),
      constants: new Map(),
    };
  };
}

export function idlLoaderFromLoaderChain(loaders: Array<IdlLoader>): IdlLoader {
  return async (programAddress: Pubkey) => {
    for (const loader of loaders) {
      try {
        return await loader(programAddress);
      } catch (_error) {
        // TODO (error) - log error stack ?
      }
    }
    throw new Error(`IDL: Unable to find IDL for program ${programAddress}`);
  };
}

export function idlLoaderFromUrl(
  urlBuilder: (programAddress: Pubkey) => string,
  options?: {
    customFetcher?: (url: string) => Promise<JsonValue>;
  },
): IdlLoader {
  const cacheIdls = new Map<Pubkey, IdlProgram>();
  const jsonFetcher =
    options?.customFetcher ??
    (async (url) => {
      const response = await fetch(url);
      return (await response.json()) as JsonValue;
    });
  return async (programAddress: Pubkey) => {
    const httpUrl = urlBuilder(programAddress);
    const httpJson = await jsonFetcher(httpUrl);
    const httpProgramIdl = idlProgramParse(httpJson);
    httpProgramIdl.metadata.address = programAddress;
    httpProgramIdl.metadata.source = httpUrl;
    cacheIdls.set(programAddress, httpProgramIdl);
    return httpProgramIdl;
  };
}

export function idlLoaderFromOnchain(
  accountDataFetcher: (accountAddress: Pubkey) => Promise<Uint8Array>,
): IdlLoader {
  return async (programAddress: Pubkey) => {
    const onchainAnchorAddress = pubkeyCreateFromSeed(
      pubkeyFindPdaAddress(programAddress, []),
      "anchor:idl",
      programAddress,
    );
    const onchainAnchorData = await accountDataFetcher(onchainAnchorAddress);
    const onchainAnchorState = idlAccountDecode(
      onchainAnchorAccountIdl,
      onchainAnchorData,
    );
    const onchainAnchorContent =
      onchainAnchorJsonCodec.decoder(onchainAnchorState);
    const onchainAnchorBytes = inflate(onchainAnchorContent.deflatedJson);
    const onchainAnchorString = utf8Decode(onchainAnchorBytes);
    const onchainAnchorJson = JSON.parse(onchainAnchorString) as JsonValue;
    const onchainAnchorIdl = idlProgramParse(onchainAnchorJson);
    onchainAnchorIdl.metadata.address = programAddress;
    onchainAnchorIdl.metadata.source = `onchain://${onchainAnchorAddress}/anchor`;
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

const onchainAnchorJsonCodec = jsonCodecObject({
  authority: jsonCodecPubkey,
  deflatedJson: jsonCodecBytesArray,
});
