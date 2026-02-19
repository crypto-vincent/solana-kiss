import { Result } from "./Utils";

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
