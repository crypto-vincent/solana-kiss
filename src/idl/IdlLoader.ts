import { inflate } from "uzip";
import { ErrorStack } from "../data/Error";
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
  return memoize(async (programAddress) => programAddress, loader);
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
    const errors = [];
    for (const loader of loaders) {
      try {
        return await loader(programAddress);
      } catch (error) {
        errors.push(error);
      }
    }
    throw new ErrorStack(
      `IDL: Unable to load IDL for program ${programAddress}`,
      errors,
    );
  };
}

export function idlLoaderFromUrl(
  urlBuilder: (programAddress: Pubkey) => string,
  options?: { customFetcher?: (url: string) => Promise<JsonValue> },
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
    const anchorIdlAddress = pubkeyCreateFromSeed(
      pubkeyFindPdaAddress(programAddress, []),
      "anchor:idl",
      programAddress,
    );
    const anchorIdlData = await accountDataFetcher(anchorIdlAddress);
    const anchorIdlState = idlAccountDecode(anchorIdlAccount, anchorIdlData);
    const anchorIdlContent = anchorIdlJsonCodec.decoder(anchorIdlState);
    const anchorIdlBytes = inflate(anchorIdlContent.deflatedJson);
    const anchorIdlString = utf8Decode(anchorIdlBytes);
    const anchorIdlJson = JSON.parse(anchorIdlString) as JsonValue;
    const anchorIdl = idlProgramParse(anchorIdlJson);
    anchorIdl.metadata.address = programAddress;
    anchorIdl.metadata.source = `onchain://${anchorIdlAddress}/anchor`;
    anchorIdl.accounts.set(anchorIdlAccount.name, anchorIdlAccount);
    return anchorIdl;
  };
}

const anchorIdlAccount = idlAccountParse("anchor:idl", {
  discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
  fields: [
    { name: "authority", type: "pubkey" },
    { name: "deflated_json", type: { vec32: "u8" } },
  ],
});

const anchorIdlJsonCodec = jsonCodecObject({
  authority: jsonCodecPubkey,
  deflatedJson: jsonCodecBytesArray,
});
