import { ErrorStack } from "../data/Error";
import { JsonValue } from "../data/Json";
import { memoize } from "../data/Memoize";
import { Pubkey } from "../data/Pubkey";
import { idlAccountParse } from "./IdlAccount";
import { idlInstructionParse } from "./IdlInstruction";
import { IdlProgram, idlProgramParse } from "./IdlProgram";
import { IdlTypedef } from "./IdlTypedef";

export type IdlLoader = (programAddress: Pubkey) => Promise<IdlProgram>;

/** Wraps an IDL loader with memoization so that the same program address is never loaded more than once. */
export function idlLoaderMemoized(loader: IdlLoader): IdlLoader {
  return memoize(async (programAddress) => programAddress, loader);
}

/** Creates an IDL loader that always succeeds by returning a generic unknown placeholder IDL. */
export function idlLoaderFallbackToUnknown(): IdlLoader {
  const typedefs = new Map<string, IdlTypedef>();
  const instructionIdl = idlInstructionParse(
    "unknown_instruction",
    {
      discriminator: [],
      accounts: [],
      args: [],
    },
    typedefs,
  );
  const accountIdl = idlAccountParse(
    "UnknownAccount",
    {
      discriminator: [],
      fields: [],
    },
    typedefs,
  );
  const eventIdl = idlAccountParse(
    "UnknownEvent",
    {
      discriminator: [],
      fields: [],
    },
    typedefs,
  );
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
      typedefs,
      accounts: new Map([[accountIdl.name, accountIdl]]),
      instructions: new Map([[instructionIdl.name, instructionIdl]]),
      events: new Map([[eventIdl.name, eventIdl]]),
      errors: new Map(),
      pdas: new Map(),
      constants: new Map(),
    };
  };
}

/** Creates an IDL loader that tries each loader in sequence and returns the result of the first successful one. */
export function idlLoaderFromLoaderSequence(
  loaders: Array<IdlLoader>,
): IdlLoader {
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

/** Creates an IDL loader that fetches and parses IDL JSON from a URL constructed by the given URL builder function. */
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
