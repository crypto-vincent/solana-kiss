import {
  JsonArray,
  JsonObject,
  JsonValue,
  jsonCodecNumber,
  jsonCodecRaw,
  jsonCodecString,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";

export type RpcHttp = (
  method: string,
  params: JsonArray,
  config: JsonObject | undefined,
) => Promise<JsonValue>;

export function rpcHttpFromUrl(
  url: string,
  context?: { commitment?: "confirmed" | "finalized" },
  customFetcher?: (
    url: string,
    request: {
      headers: { [key: string]: string };
      method: string;
      body: string;
    },
  ) => Promise<JsonValue>,
): RpcHttp {
  const fetcher =
    customFetcher ??
    (async (url, request) => {
      return (await fetch(url, request)).json();
    });
  return async function (method, params, config) {
    const contextCommitment = context?.commitment;
    if (config !== undefined) {
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
    const responseInfo = responseJsonDecoder(responseJson);
    const responseError = responseInfo.error;
    if (responseError !== undefined) {
      throw new Error(
        `RpcHttp: Error ${responseError.code}: ${responseError.message}`,
      );
    }
    if (responseInfo.jsonrpc !== "2.0") {
      throw new Error(
        `RpcHttp: Expected response jsonrpc: "2.0" (found: "${responseInfo.jsonrpc}")`,
      );
    }
    if (responseInfo.id !== requestId) {
      throw new Error(
        `RpcHttp: Expected response id: ${requestId} (found: ${responseInfo.id})`,
      );
    }
    return responseInfo.result;
  };
}

export function rpcHttpWithTimeout(
  rpcHttp: RpcHttp,
  timeoutMs: number,
): RpcHttp {
  return async function (method, params, config) {
    return await Promise.race<JsonValue>([
      rpcHttp(method, params, config),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`RpcHttp: Timeout (${timeoutMs}ms)`)),
          timeoutMs,
        ),
      ),
    ]);
  };
}

export function rpcHttpWithMaxConcurrentRequests(
  rpcHttp: RpcHttp,
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
      return await rpcHttp(method, params, config);
    } finally {
      ongoingRequests--;
      queue.shift()?.();
    }
  };
}

export function rpcHttpWithRetryOnError(
  rpcHttp: RpcHttp,
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
        return await rpcHttp(method, params, config);
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

const responseJsonDecoder = jsonDecoderObject({
  jsonrpc: jsonCodecString.decoder,
  id: jsonCodecNumber.decoder,
  error: jsonDecoderOptional(
    jsonDecoderObject({
      code: jsonCodecNumber.decoder,
      message: jsonCodecString.decoder,
    }),
  ),
  result: jsonDecoderOptional(jsonCodecRaw.decoder),
});
