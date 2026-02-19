import {
  JsonArray,
  JsonObject,
  JsonValue,
  jsonCodecNumber,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderConst,
  jsonDecoderObjectToObject,
  jsonDecoderTrySequentially,
  jsonDecoderWrapped,
} from "../data/Json";
import { OneKeyOf } from "../data/Utils";

export type RpcHttp = (
  method: string,
  params: JsonArray,
  config: JsonObject | undefined,
) => Promise<JsonValue>;

export class RpcHttpError extends Error {
  public readonly code: number;
  public readonly desc: string;
  public readonly data: JsonValue;
  constructor(message: string, code: number, desc: string, data: JsonValue) {
    super(message);
    this.code = code;
    this.desc = desc;
    this.data = data;
  }
}

/** Creates an RPC HTTP client for a given Solana node URL. */

export function rpcHttpFromUrl(
  url: string,
  options?: {
    commitment?: "confirmed" | "finalized";
    customFetcher?: (
      url: string,
      request: {
        headers: { [key: string]: string };
        method: string;
        body: string;
      },
    ) => Promise<JsonValue>;
  },
): RpcHttp {
  const fetcher =
    options?.customFetcher ??
    (async (url, request) => {
      const response = await fetch(url, request);
      const jsonValue = await response.json();
      return jsonValue as JsonValue;
    });
  return async function (method, params, config) {
    if (config !== undefined) {
      const contextCommitment = options?.commitment;
      if (contextCommitment !== undefined) {
        config = {
          preflightCommitment: contextCommitment,
          commitment: contextCommitment,
          ...config,
        };
      }
      params.push(config);
    }
    const requestId = uniqueRequestId++;
    const responseJson = await fetcher(url, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method,
        params,
      }),
    });
    const responseValue = responseJsonDecoder(responseJson);
    if (responseValue.requestId !== requestId) {
      throw new Error(
        `RpcHttp: Expected response id: ${requestId} (found: ${responseValue.requestId})`,
      );
    }
    const responseError = responseValue.result.error;
    if (responseError) {
      throw new RpcHttpError(
        `RpcHttp: Error ${responseError.code}: ${responseError.desc}`,
        responseError.code,
        responseError.desc,
        responseError.data,
      );
    }
    return responseValue.result.value;
  };
}

/** Wraps an RPC client to abort requests exceeding the timeout. */

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

/** Wraps an RPC client to limit concurrent in-flight requests. */

export function rpcHttpWithMaxConcurrentRequests(
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

/** Wraps an RPC client to retry failed requests automatically. */

export function rpcHttpWithRetryOnError(
  self: RpcHttp,
  retryApprover: (context: {
    retriedCounter: number;
    totalDurationMs: number;
    requestMethod: string;
    requestParams: JsonArray;
    requestConfig: JsonObject | undefined;
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

const responseJsonDecoder = jsonDecoderTrySequentially<{
  requestId: number;
  result: OneKeyOf<{
    value: JsonValue;
    error: {
      code: number;
      desc: string;
      data: JsonValue;
    };
  }>;
}>([
  jsonDecoderWrapped(
    jsonDecoderObjectToObject({
      jsonrpc: jsonDecoderConst("2.0"),
      id: jsonCodecNumber.decoder,
      result: jsonCodecValue.decoder,
    }),
    (response) => ({
      requestId: response.id,
      result: { value: response.result },
    }),
  ),
  jsonDecoderWrapped(
    jsonDecoderObjectToObject({
      jsonrpc: jsonDecoderConst("2.0"),
      id: jsonCodecNumber.decoder,
      error: jsonDecoderObjectToObject(
        {
          code: jsonCodecNumber.decoder,
          desc: jsonCodecString.decoder,
          data: jsonCodecValue.decoder,
        },
        {
          keysEncoding: {
            code: "code",
            desc: "message",
            data: "data",
          },
        },
      ),
    }),
    (response) => ({
      requestId: response.id,
      result: { error: response.error },
    }),
  ),
]);
