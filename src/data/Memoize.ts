import { Result } from "./Utils";

export function memoize<In, Out, CacheKey>(
  inputToCacheKey: (input: In) => Promise<CacheKey>,
  invocation: (input: In) => Promise<Out>,
  options?: {
    cacheUseApprover?: (
      input: In,
      context: {
        cacheSize: number;
        cachedAt: Date;
        cachedResult: Result<Out>;
      },
    ) => Promise<boolean>;
    cacheSetApprover?: (
      input: In,
      context: {
        cacheSize: number;
        cachedAt: Date;
        cachedResult: Result<Out>;
      },
    ) => Promise<boolean>;
  },
): (input: In) => Promise<Out> {
  const cacheUseApprover = options?.cacheUseApprover ?? (async () => true);
  const cacheSetApprover = options?.cacheSetApprover ?? (async () => true);
  const cache = new Map<CacheKey, { result: Result<Out>; at: Date }>();
  return async (input) => {
    const cacheKey = await inputToCacheKey(input);
    let context = cache.get(cacheKey);
    if (
      context !== undefined &&
      !(await cacheUseApprover(input, {
        cacheSize: cache.size,
        cachedAt: context.at,
        cachedResult: context.result,
      }))
    ) {
      context = undefined;
      cache.delete(cacheKey);
    }
    if (context === undefined) {
      try {
        const value = await invocation(input);
        context = { result: { value }, at: new Date() };
      } catch (error) {
        context = { result: { error }, at: new Date() };
      }
      if (
        await cacheSetApprover(input, {
          cacheSize: cache.size,
          cachedAt: context.at,
          cachedResult: context.result,
        })
      ) {
        cache.set(cacheKey, context);
      }
    }
    if (context.result.error) {
      throw context.result.error;
    }
    return context.result.value!;
  };
}
