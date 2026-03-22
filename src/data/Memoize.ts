import { Result } from "./Utils";

/**
 * Memoizes an async function, caching results by a derived key.
 * @param inputToCacheKey - Maps input to a cache key.
 * @param invocation - Async function to memoize.
 * @param options - Optional approvers for cache reads/writes.
 * @param options.cacheUseApprover - Called before using a cached value; return `false` to invalidate.
 * @param options.cacheSetApprover - Called before storing a result; return `false` to skip caching.
 * @returns Memoized async function.
 */
export function memoize<CacheKey, In, Out>(
  inputToCacheKey: (input: In) => Promise<CacheKey>,
  invocation: (input: In) => Promise<Out>,
  options?: {
    cacheUseApprover?: (
      input: In,
      context: {
        /** Number of entries currently in the cache. */
        cacheSize: number;
        /** Cached entry being evaluated for reuse. */
        cacheValue: { result: Result<Out>; at: Date };
      },
    ) => Promise<boolean>;
    cacheSetApprover?: (
      input: In,
      context: {
        /** Cache size before this potential insertion. */
        cacheSize: number;
        /** Result about to be cached, with invocation timestamp. */
        cacheValue: { result: Result<Out>; at: Date };
      },
    ) => Promise<boolean>;
  },
): (input: In) => Promise<Readonly<Out>> {
  const cacheUseApprover = options?.cacheUseApprover ?? (async () => true);
  const cacheSetApprover = options?.cacheSetApprover ?? (async () => true);
  const cacheMap = new Map<CacheKey, { result: Result<Out>; at: Date }>();
  return async (input) => {
    const cacheKey = await inputToCacheKey(input);
    let cacheValue = cacheMap.get(cacheKey);
    if (
      cacheValue !== undefined &&
      !(await cacheUseApprover(input, {
        cacheSize: cacheMap.size,
        cacheValue,
      }))
    ) {
      cacheValue = undefined;
      cacheMap.delete(cacheKey);
    }
    if (cacheValue === undefined) {
      try {
        const value = await invocation(input);
        cacheValue = { result: { value }, at: new Date() };
      } catch (error) {
        cacheValue = { result: { error }, at: new Date() };
      }
      if (
        await cacheSetApprover(input, {
          cacheSize: cacheMap.size,
          cacheValue,
        })
      ) {
        cacheMap.set(cacheKey, cacheValue);
      }
    }
    if ("error" in cacheValue.result) {
      throw cacheValue.result.error;
    }
    return cacheValue.result.value;
  };
}
