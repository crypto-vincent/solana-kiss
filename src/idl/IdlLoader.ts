import { ErrorStack } from "../data/Error";
import { JsonValue } from "../data/Json";
import { memoize } from "../data/Memoize";
import { Pubkey } from "../data/Pubkey";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

export type IdlLoader = (programAddress: Pubkey) => Promise<IdlProgram>;

export function idlLoaderMemoized(loader: IdlLoader): IdlLoader {
  return memoize(async (programAddress) => programAddress, loader);
}

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
