import {
  JsonArray,
  JsonObject,
  JsonValue,
  jsonCodecNumber,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderObject,
  jsonDecoderOptional,
} from "../data/Json";

// TODO - RPC WS ?
export type RpcHttp = (
  method: string,
  params: JsonArray,
  config: JsonObject | undefined,
) => Promise<JsonValue>;

export class RpcHttpError extends Error {
  public readonly code: number;
  public readonly desc: string;
  public readonly data: JsonValue | undefined;
  constructor(
    message: string,
    code: number,
    desc: string,
    data: JsonValue | undefined,
  ) {
    super(message);
    this.code = code;
    this.desc = desc;
    this.data = data;
  }
}

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
      return (await fetch(url, request)).json();
    });
  return async function (method, params, config) {
    const contextCommitment = options?.commitment;
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
    const responseValue = responseJsonDecoder(responseJson);
    const responseError = responseValue.error;
    if (responseError !== undefined) {
      throw new RpcHttpError(
        `RpcHttp: Error ${responseError.code}: ${responseError.message}`,
        responseError.code,
        responseError.message,
        responseError.data,
      );
    }
    if (responseValue.jsonrpc !== "2.0") {
      throw new Error(
        `RpcHttp: Expected response jsonrpc: "2.0" (found: "${responseValue.jsonrpc}")`,
      );
    }
    if (responseValue.id !== requestId) {
      throw new Error(
        `RpcHttp: Expected response id: ${requestId} (found: ${responseValue.id})`,
      );
    }
    if (responseValue.result === undefined) {
      throw new Error(`RpcHttp: Missing response result`);
    }
    return responseValue.result;
  };
}

export function rpcHttpWithTimeout(self: RpcHttp, timeoutMs: number): RpcHttp {
  return async function (method, params, config) {
    return await Promise.race<JsonValue>([
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

const responseJsonDecoder = jsonDecoderObject({
  jsonrpc: jsonCodecString.decoder,
  id: jsonCodecNumber.decoder,
  error: jsonDecoderOptional(
    jsonDecoderObject({
      code: jsonCodecNumber.decoder,
      message: jsonCodecString.decoder,
      data: jsonDecoderOptional(jsonCodecValue.decoder),
    }),
  ),
  result: jsonDecoderOptional(jsonCodecValue.decoder),
});
