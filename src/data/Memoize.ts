import { Result } from "./Utils";

export class Memoizer<In, Out, CacheKey = string> {
  readonly #invocation: (input: In) => Promise<Out>;
  readonly #cacheKey: (input: In) => Promise<CacheKey>;
  readonly #cacheApprover: (input: In, result: Result<Out>) => Promise<boolean>;
  readonly #cacheResults: Map<CacheKey, Result<Out>>;

  constructor(
    invocation: (input: In) => Promise<Out>,
    cacheKey: (input: In) => Promise<CacheKey>,
    cacheApprover?: (input: In, result: Result<Out>) => Promise<boolean>,
  ) {
    this.#invocation = invocation;
    this.#cacheKey = cacheKey;
    this.#cacheApprover = cacheApprover ?? (async () => true);
    this.#cacheResults = new Map();
  }

  public async invoke(input: In): Promise<Out> {
    const cacheKey = await this.#cacheKey(input);
    let result = this.#cacheResults.get(cacheKey);
    if (result !== undefined && !(await this.#cacheApprover(input, result))) {
      result = undefined;
      this.#cacheResults.delete(cacheKey);
    }
    if (result === undefined) {
      try {
        const value = await this.#invocation(input);
        result = { value };
      } catch (error) {
        result = { error };
      }
      this.#cacheResults.set(cacheKey, result);
    }
    if (result.error) {
      throw result.error;
    }
    return result.value!;
  }
}
