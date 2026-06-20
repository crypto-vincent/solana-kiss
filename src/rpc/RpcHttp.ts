import { ErrorStack } from "../data/Error";
import {
  JsonArray,
  jsonCodecNumber,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderConst,
  jsonDecoderNullable,
  jsonDecoderObjectToObject,
  JsonFetcher,
  jsonFetcherDefault,
  JsonObject,
  jsonParse,
  jsonStringify,
  JsonValue,
} from "../data/Json";
import { timeoutMs } from "../data/Utils";

/**
 * Solana JSON-RPC HTTP client function.
 * @param method - RPC method name (e.g. `"getAccountInfo"`).
 * @param params - Positional parameters.
 * @param config - Config object appended as last param, or `"skip-configuration-object"`.
 * @returns Raw JSON result from the RPC response.
 */
export type RpcHttp = (
  method: string,
  params: Readonly<JsonArray>,
  config: Readonly<JsonObject> | "skip-configuration-object",
) => Promise<JsonValue>;

/**
 * Error thrown when an HTTP fetch fails (non-2xx status)
 */
export class RpcHttpFetchError extends Error {
  /** HTTP headers of the failed request, if any. */
  public readonly headers: { [key: string]: string };
  /** HTTP status code of the failed request. */
  public readonly status: number;
  /**
   * @param message - Human-readable error message.
   * @param info - Additional information about the error.
   */
  constructor(
    message: string,
    info: { headers: { [key: string]: string }; status: number },
  ) {
    super(message);
    this.headers = info.headers;
    this.status = info.status;
  }
}

/**
 * Error thrown when a JSON-RPC response contains an error payload.
 */
export class RpcHttpSolanaError extends Error {
  /** The numeric JSON-RPC error code. */
  public readonly code: number;
  /** A short description of the error returned by the node. */
  public readonly desc: string;
  /** Additional error data attached to the JSON-RPC error object, if any. */
  public readonly data: JsonValue;
  /**
   * @param message - Human-readable error message.
   * @param info - Additional information about the error.
   */
  constructor(
    message: string,
    info: { code: number; desc: string; data: JsonValue },
  ) {
    super(message);
    this.code = info.code;
    this.desc = info.desc;
    this.data = info.data;
  }
}

/**
 * Creates an {@link RpcHttp} client for the given Solana node URL.
 * @param url - HTTP(S) URL of the Solana RPC node.
 * @param options.commitmentLevel - Default commitment level (`"confirmed"` or `"finalized"`).
 * @param options.extraRequestHeaders - Extra HTTP headers for every request.
 * @param options.customJsonFetcher - Custom fetch implementation.
 * @returns {@link RpcHttp} function bound to the URL.
 */
export function rpcHttpFromUrl(
  url: URL,
  options?: {
    commitmentLevel?: "confirmed" | "finalized";
    extraRequestHeaders?: { [key: string]: string };
    customJsonFetcher?: JsonFetcher;
  },
): RpcHttp {
  const jsonFetcher = options?.customJsonFetcher ?? jsonFetcherDefault;
  return async function (method, params, config) {
    const paramsCopy = [...params];
    if (config !== "skip-configuration-object") {
      const commitmentLevel = options?.commitmentLevel ?? "confirmed";
      config = {
        preflightCommitment: commitmentLevel,
        commitment: commitmentLevel,
        ...config,
      };
      paramsCopy.push(config);
    }
    const requestId = uniqueRequestId++;
    const responseJson = await jsonFetcher(
      url,
      {
        headers: options?.extraRequestHeaders,
        method: "POST",
        body: jsonStringify({
          jsonrpc: "2.0",
          id: requestId,
          method,
          params: paramsCopy,
        }),
      },
      async ({ headers, status, body }) => {
        if (status < 200 || status >= 300) {
          throw new RpcHttpFetchError(
            `RpcHttp: HTTP error ${status} for method ${method}`,
            { status, headers },
          );
        }
        return jsonParse(body);
      },
    );
    const responseValue = responseJsonDecoder(responseJson);
    const responseId = responseValue.id;
    if (responseId !== requestId) {
      throw new ErrorStack(
        `RpcHttp: Expected response id: ${requestId} (found: ${responseId})`,
      );
    }
    const responseError = responseValue.error;
    if (responseError !== null) {
      throw new RpcHttpSolanaError(
        `RpcHttp: Error ${responseError.code}: ${responseError.message}`,
        {
          code: responseError.code,
          desc: responseError.message,
          data: responseError.data,
        },
      );
    }
    return responseValue.result;
  };
}

/**
 * Wraps an {@link RpcHttp} client with a per-request timeout.
 * @param timeoutMs - Max duration before rejection.
 * @returns {@link RpcHttp} with timeout enforcement.
 */
export function rpcHttpWithTimeout(self: RpcHttp, timeoutMs: number): RpcHttp {
  return async function (method, params, config) {
    return Promise.race<JsonValue>([
      self(method, params, config),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`RpcHttp: Timeout (${timeoutMs}ms)`)),
          timeoutMs,
        ),
      ),
    ]);
  };
}

/**
 * Wraps an {@link RpcHttp} client to cap in-flight requests. Excess requests are queued.
 * @param maxConcurrentRequests - Max simultaneous requests (must be > 0).
 * @returns {@link RpcHttp} with concurrency limiting.
 * @throws If `maxConcurrentRequests` ≤ 0.
 */
export function rpcHttpWithConcurrentRequestsLimit(
  self: RpcHttp,
  maxConcurrentRequests: number,
): RpcHttp {
  if (maxConcurrentRequests <= 0) {
    throw new Error("RpcHttp: maxConcurrentRequests must be > 0");
  }
  let ongoingRequests = 0;
  const queue = new Array<() => void>();
  return async function (method, params, config) {
    if (ongoingRequests >= maxConcurrentRequests) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    ongoingRequests++;
    try {
      return await self(method, params, config);
    } finally {
      ongoingRequests--;
      queue.shift()?.();
    }
  };
}

/**
 * Wraps an {@link RpcHttp} client to limit request rate. Excess requests are queued.
 * @param maxRequestsPerSecond - Max requests per second (must be > 0).
 * @returns {@link RpcHttp} with rate limiting.
 * @throws If `maxRequestsPerSecond` ≤ 0.
 */
export function rpcHttpWithRequestsPerSecondLimit(
  self: RpcHttp,
  maxRequestsPerSecond: number,
): RpcHttp {
  if (maxRequestsPerSecond <= 0) {
    throw new Error("RpcHttp: maxRequestsPerSecond must be > 0");
  }
  let ongoingRequest = false;
  const queue = new Array<() => void>();
  return async function (method, params, config) {
    if (ongoingRequest) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    ongoingRequest = true;
    setTimeout(() => {
      ongoingRequest = false;
      queue.shift()?.();
    }, 1000 / maxRequestsPerSecond);
    return await self(method, params, config);
  };
}

/**
 * Wraps an {@link RpcHttp} client to automatically retry on failure.
 * @param retryApprover - Called on each failure; return `true` to retry, `false` to rethrow.
 * @returns {@link RpcHttp} with retry support.
 */
export function rpcHttpWithRetryOnError(
  self: RpcHttp,
  retryApprover: (context: {
    /** Retry count so far (0 on first failure). */
    retriedCounter: number;
    /** Total elapsed ms since first attempt. */
    totalDurationMs: number;
    /** RPC method name. */
    requestMethod: string;
    /** Positional params. */
    requestParams: Readonly<JsonArray>;
    /** Config object. */
    requestConfig: Readonly<JsonObject> | "skip-configuration-object";
    /** Last error thrown. */
    lastError: any;
  }) => Promise<boolean>,
): RpcHttp {
  return async function (method, params, config) {
    const startTime = Date.now();
    let retriedCounter = 0;
    while (true) {
      try {
        return await self(method, params, config);
      } catch (error) {
        const totalDurationMs = Date.now() - startTime;
        const retryApproved = await retryApprover({
          retriedCounter,
          totalDurationMs,
          requestMethod: method,
          requestParams: params,
          requestConfig: config,
          lastError: error,
        });
        if (!retryApproved) {
          throw error;
        }
        retriedCounter++;
      }
    }
  };
}

/**
 * Wraps an {@link RpcHttp} client to automatically wait and retry on HTTP 429 (Too Many Requests) errors.
 * @param self - {@link RpcHttp} client to wrap.
 * @returns {@link RpcHttp} with automatic retry on 429 errors.
 */
export function rpcHttpWithServerRateLimitRespect(self: RpcHttp): RpcHttp {
  return async function (method, params, config) {
    while (true) {
      try {
        return await self(method, params, config);
      } catch (error) {
        if (error instanceof RpcHttpFetchError) {
          if (error.status === 429) {
            const retryAfterHeader = error.headers["retry-after"];
            if (retryAfterHeader) {
              const retryAfterSeconds = parseFloat(retryAfterHeader);
              if (!isNaN(retryAfterSeconds)) {
                await timeoutMs(retryAfterSeconds * 1000);
                continue;
              }
            }
            await timeoutMs(1000);
            continue;
          }
        }
        throw error;
      }
    }
  };
}

let uniqueRequestId = 1;

const responseJsonDecoder = jsonDecoderObjectToObject({
  jsonrpc: jsonDecoderConst("2.0"),
  id: jsonCodecNumber.decoder,
  result: jsonCodecValue.decoder,
  error: jsonDecoderNullable(
    jsonDecoderObjectToObject({
      code: jsonCodecNumber.decoder,
      message: jsonCodecString.decoder,
      data: jsonCodecValue.decoder,
    }),
  ),
});
