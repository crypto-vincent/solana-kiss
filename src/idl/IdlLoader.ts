import { URL } from "url";
import { ErrorStack } from "../data/Error";
import { JsonFetcher, jsonFetcherDefault } from "../data/Json";
import { memoize } from "../data/Memoize";
import { Pubkey } from "../data/Pubkey";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

/** Async function that loads an {@link IdlProgram} for a given program address. */
export type IdlLoader = (
  programAddress: Pubkey,
) => Promise<Readonly<IdlProgram>>;

/**
 * Wraps an {@link IdlLoader} with memoization (cached by program address).
 * @param loader - Loader to memoize.
 * @returns Memoized {@link IdlLoader}.
 */
export function idlLoaderMemoized(loader: IdlLoader): IdlLoader {
  return memoize(async (programAddress) => programAddress, loader);
}

/**
 * Creates an {@link IdlLoader} that tries each loader in order, returning the first success.
 * Throws an {@link ErrorStack} if all loaders fail.
 * @param loaders - Ordered loaders to try.
 * @returns {@link IdlLoader} that attempts loaders sequentially.
 */
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

/**
 * Creates an {@link IdlLoader} that fetches IDL JSON from a URL built by `urlBuilder`.
 * @param urlBuilder - Maps program address to fetch URL.
 * @param options.customJsonFetcher - Optional custom JSON fetcher.
 * @returns {@link IdlLoader} backed by HTTP.
 */
export function idlLoaderFromUrl(
  urlBuilder: (programAddress: Pubkey) => URL,
  options?: { customJsonFetcher?: JsonFetcher },
): IdlLoader {
  const cacheIdls = new Map<Pubkey, IdlProgram>();
  const jsonFetcher = options?.customJsonFetcher ?? jsonFetcherDefault;
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
