import { Result } from "./Utils";

export function memoize<In, Out, CacheKey>(
  invocation: (input: In) => Promise<Out>,
  inputToCacheKey: (input: In) => Promise<CacheKey>,
  cacheApprover?: (input: In, result: Result<Out>) => Promise<boolean>,
): (input: In) => Promise<Out> {
  cacheApprover = cacheApprover ?? (async () => true);
  const cacheResults = new Map<CacheKey, Result<Out>>();
  return async (input) => {
    const cacheKey = await inputToCacheKey(input);
    let result = cacheResults.get(cacheKey);
    if (result !== undefined && !(await cacheApprover(input, result))) {
      result = undefined;
      cacheResults.delete(cacheKey);
    }
    if (result === undefined) {
      try {
        const value = await invocation(input);
        result = { value };
      } catch (error) {
        result = { error };
      }
      cacheResults.set(cacheKey, result);
    }
    if (result.error) {
      throw result.error;
    }
    return result.value!;
  };
}
