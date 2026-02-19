import { ErrorStack } from "../data/Error";
import { JsonValue } from "../data/Json";
import { memoize } from "../data/Memoize";
import { Pubkey } from "../data/Pubkey";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

/**
 * A function that asynchronously loads an {@link IdlProgram} for a given Solana program address.
 */
export type IdlLoader = (programAddress: Pubkey) => Promise<IdlProgram>;

/**
 * Wraps an {@link IdlLoader} with memoization so that repeated calls for the
 * same program address return the cached result without re-fetching.
 * @param loader - The underlying IDL loader to memoize.
 * @returns A new {@link IdlLoader} that caches results by program address.
 */
export function idlLoaderMemoized(loader: IdlLoader): IdlLoader {
  return memoize(async (programAddress) => programAddress, loader);
}

/**
 * Creates an {@link IdlLoader} that tries each loader in the provided sequence
 * in order, returning the first successful result. If all loaders fail,
 * throws an {@link ErrorStack} aggregating all individual errors.
 * @param loaders - An ordered array of {@link IdlLoader} instances to try.
 * @returns A new {@link IdlLoader} that attempts loaders sequentially.
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
 * Creates an {@link IdlLoader} that fetches IDL JSON from a URL built by
 * the provided `urlBuilder` function. Parses the response as an IDL program
 * and records the program address and source URL on the resulting metadata.
 * @param urlBuilder - A function that maps a program address to a fetch URL.
 * @param options - Optional configuration, including a custom JSON fetcher.
 * @returns A new {@link IdlLoader} backed by HTTP fetching.
 */
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
