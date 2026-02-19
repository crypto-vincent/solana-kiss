import { Result } from "./Utils";

/**
 * Creates a memoized wrapper around an async function, caching results by a derived key.
 * Supports optional approver callbacks to control cache reads and writes.
 * @param inputToCacheKey - Async function that maps an input to a cache key.
 * @param invocation - The async function to memoize.
 * @param options - Optional approvers to control when cached values are used or stored.
 * @param options.cacheUseApprover - Called before using a cached value; return `false` to bypass the cache.
 * @param options.cacheSetApprover - Called before storing a result; return `false` to skip caching.
 * @returns An async function with the same signature as `invocation` that uses the cache.
 */
export function memoize<CacheKey, In, Out>(
  inputToCacheKey: (input: In) => Promise<CacheKey>,
  invocation: (input: In) => Promise<Out>,
  options?: {
    cacheUseApprover?: (
      input: In,
      context: {
        cacheSize: number;
        cacheValue: { result: Result<Out>; at: Date };
      },
    ) => Promise<boolean>;
    cacheSetApprover?: (
      input: In,
      context: {
        cacheSize: number;
        cacheValue: { result: Result<Out>; at: Date };
      },
    ) => Promise<boolean>;
  },
): (input: In) => Promise<Out> {
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
    if (cacheValue.result.error) {
      throw cacheValue.result.error;
    }
    return cacheValue.result.value!;
  };
}
