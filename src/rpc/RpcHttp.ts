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
  JsonValue,
} from "../data/Json";

/**
 * A function type representing a Solana JSON-RPC HTTP client.
 * Sends a JSON-RPC request to the Solana node and returns the raw result value.
 *
 * @param method - The JSON-RPC method name (e.g. `"getAccountInfo"`).
 * @param params - The positional parameters for the RPC method.
 * @param config - An optional configuration object appended as the last parameter (e.g. commitment, encoding).
 * @returns A promise resolving to the raw JSON result value from the RPC response.
 */
export type RpcHttp = (
  method: string,
  params: Readonly<JsonArray>,
  config: Readonly<JsonObject> | "skip-configuration-object",
) => Promise<JsonValue>;

/**
 * Error thrown when a Solana JSON-RPC HTTP response contains an error payload.
 */
export class RpcHttpError extends Error {
  /** The numeric JSON-RPC error code. */
  public readonly code: number;
  /** A short description of the error returned by the node. */
  public readonly desc: string;
  /** Additional error data attached to the JSON-RPC error object, if any. */
  public readonly data: JsonValue;
  /**
   * @param message - Human-readable error message.
   * @param code - The numeric JSON-RPC error code.
   * @param desc - Short description of the error.
   * @param data - Additional error data from the RPC response.
   */
  constructor(message: string, code: number, desc: string, data: JsonValue) {
    super(message);
    this.code = code;
    this.desc = desc;
    this.data = data;
  }
}

/**
 * Creates an {@link RpcHttp} client that sends JSON-RPC requests to the given Solana node URL.
 *
 * @param url - The HTTP(S) URL of the Solana RPC node.
 * @param options - Optional configuration.
 * @param options.commitmentLevel - Commitment level (`"confirmed"` or `"finalized"`) applied to every request unless overridden per-call.
 * @param options.extraRequestHeaders - Additional HTTP headers to include in every request.
 * @param options.customJsonFetcher - Custom HTTP fetch implementation. Defaults to the global `fetch`.
 * @returns An {@link RpcHttp} function bound to the given URL.
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
    if (config !== "skip-configuration-object") {
      const commitmentLevel = options?.commitmentLevel ?? "confirmed";
      config = {
        preflightCommitment: commitmentLevel,
        commitment: commitmentLevel,
        ...config,
      };
      params = [...params, config];
    }
    const requestId = uniqueRequestId++;
    const responseJson = await jsonFetcher(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.extraRequestHeaders,
      },
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method,
        params,
      }),
    });
    const responseValue = responseJsonDecoder(responseJson);
    const responseId = responseValue.id;
    if (responseId !== requestId) {
      throw new ErrorStack(
        `RpcHttp: Expected response id: ${requestId} (found: ${responseId})`,
      );
    }
    const responseError = responseValue.error;
    if (responseError !== null) {
      // TODO - nicer exposure of the response value error data fields
      throw new RpcHttpError(
        `RpcHttp: Error ${responseError.code}: ${responseError.message}`,
        responseError.code,
        responseError.message,
        responseError.data,
      );
    }
    return responseValue.result;
  };
}

/**
 * Wraps an {@link RpcHttp} client to add a per-request timeout.
 * Rejects with an error if the RPC call does not complete within `timeoutMs` milliseconds.
 *
 * @param self - The underlying {@link RpcHttp} client to wrap.
 * @param timeoutMs - Maximum allowed duration in milliseconds before the request is rejected.
 * @returns A new {@link RpcHttp} client with timeout enforcement.
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
 * Wraps an {@link RpcHttp} client to cap the number of in-flight requests.
 * Excess requests are queued and executed as earlier requests complete.
 *
 * @param self - The underlying {@link RpcHttp} client to wrap.
 * @param maxConcurrentRequests - Maximum number of requests allowed to run simultaneously. Must be greater than 0.
 * @returns A new {@link RpcHttp} client with concurrency limiting.
 * @throws If `maxConcurrentRequests` is not greater than 0.
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
 * Wraps an {@link RpcHttp} client to limit the rate of requests to a maximum per second.
 * Excess requests are queued and executed at a controlled rate.
 *
 * @param self - The underlying {@link RpcHttp} client to wrap.
 * @param maxRequestsPerSecond - Maximum number of requests allowed per second. Must be greater than 0.
 * @returns A new {@link RpcHttp} client with rate limiting.
 * @throws If `maxRequestsPerSecond` is not greater than 0.
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
 * Wraps an {@link RpcHttp} client to automatically retry failed requests.
 * The `retryApprover` callback is invoked after each failure; returning `true` retries the request,
 * while returning `false` re-throws the original error.
 *
 * @param self - The underlying {@link RpcHttp} client to wrap.
 * @param retryApprover - Async callback invoked on each error, receiving context about the failure.
 *   Return `true` to retry the request, or `false` to propagate the error.
 * @returns A new {@link RpcHttp} client with automatic retry support.
 */
export function rpcHttpWithRetryOnError(
  self: RpcHttp,
  retryApprover: (context: {
    retriedCounter: number;
    totalDurationMs: number;
    requestMethod: string;
    requestParams: Readonly<JsonArray>;
    requestConfig: Readonly<JsonObject> | "skip-configuration-object";
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
