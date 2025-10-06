import {
  JsonObject,
  JsonValue,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeNumber,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";

export type RpcHttp = (
  method: string,
  params: Array<JsonValue>,
  config: JsonObject,
) => Promise<JsonValue>;

export function rpcHttpFromUrl(
  url: string,
  context?: {
    commitment?: "confirmed" | "finalized"; // TODO - should this stay an object?
  },
  customFetch?: (
    url: string,
    request: {
      headers: { [key: string]: string };
      method: string;
      body: string;
    },
  ) => Promise<{ json: () => Promise<JsonValue> }>,
): RpcHttp {
  return async function (methodName, params, config) {
    const contextCommitment = context?.commitment;
    if (contextCommitment !== undefined) {
      config = {
        preflightCommitment: contextCommitment,
        commitment: contextCommitment,
        ...config,
      };
    }
    const requestId = uniqueRequestId++;
    const responseRaw = await (customFetch ?? fetch)(url, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method: methodName,
        params: [...params, config],
      }),
    });
    const responseJson = await responseRaw.json();
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
  retryApprover: (
    error: any,
    context: {
      retriedCounter: number;
      totalDurationMs: number;
    },
  ) => Promise<boolean>,
): RpcHttp {
  return async function (method, params, config) {
    let startTime = Date.now();
    let retriedCounter = 0;
    while (true) {
      try {
        return await rpcHttp(method, params, config);
      } catch (error) {
        const retryApproved = await retryApprover(error, {
          retriedCounter,
          totalDurationMs: Date.now() - startTime,
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

const responseJsonDecoder = jsonDecoderObject((key) => key, {
  jsonrpc: jsonTypeString.decoder,
  id: jsonTypeNumber.decoder,
  error: jsonDecoderOptional(
    jsonDecoderObject((key) => key, {
      code: jsonTypeNumber.decoder,
      message: jsonTypeString.decoder,
    }),
  ),
  result: jsonDecoderOptional(jsonTypeValue.decoder),
});
