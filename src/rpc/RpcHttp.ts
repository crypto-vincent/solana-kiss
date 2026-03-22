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

/** Error thrown when a JSON-RPC response contains an error payload. */
export class RpcHttpError extends Error {
  /** The numeric JSON-RPC error code. */
  public readonly code: number;
  /** A short description of the error returned by the node. */
  public readonly desc: string;
  /** Additional error data attached to the JSON-RPC error object, if any. */
  public readonly data: JsonValue;
  /**
   * @param message - Human-readable error message.
   * @param code - JSON-RPC error code.
   * @param desc - Short description.
   * @param data - Additional error data.
   */
  constructor(message: string, code: number, desc: string, data: JsonValue) {
    super(message);
    this.code = code;
    this.desc = desc;
    this.data = data;
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
