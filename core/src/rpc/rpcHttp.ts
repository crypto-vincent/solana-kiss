import {
  JsonValue,
  jsonTypeNullableToOptional,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeString,
  jsonTypeValue,
} from "../data/json";
import { Commitment } from "../types";

export type RpcHttp = (
  method: string,
  params: Array<any>,
) => Promise<JsonValue>;

export function rpcHttpFromUrl(
  url: string,
  defaultContext?: {
    commitment?: Commitment; // TODO - should this stay an object?
  },
  // TODO - support custom fetch implementations (for environments that don't have fetch natively)
): RpcHttp {
  return async function (method, params) {
    if (params.length <= 0) {
      throw new Error(`RpcHttp: Expected params array to not be empty`);
    }
    const defaultCommitment = defaultContext?.commitment;
    if (defaultCommitment !== undefined) {
      const paramsLastIndex = params.length - 1;
      if (params[paramsLastIndex].commitment === undefined) {
        params = params.slice();
        params[paramsLastIndex] = {
          ...params[paramsLastIndex],
          commitment: defaultCommitment,
        };
      }
    }
    const requestId = uniqueRequestId++;
    const responseRaw = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method,
        params,
      }),
    });
    const responseJson = await responseRaw.json();
    const response = responseJsonType.decode(responseJson);
    if (response.version !== "2.0") {
      throw new Error(
        `RpcHttp: Expected response version: "2.0" (found: "${response.version}")`,
      );
    }
    if (response.id !== requestId) {
      throw new Error(
        `RpcHttp: Expected response id: ${requestId} (found: ${response.id})`,
      );
    }
    const error = response.error;
    if (error !== undefined) {
      throw new Error(`RpcHttp: Error ${error.code}: ${error.message}`);
    }
    return response.result;
  };
}

export function rpcHttpWithMaxConcurrentRequests(
  rpc: RpcHttp,
  maxConcurrentRequests: number,
): RpcHttp {
  if (maxConcurrentRequests <= 0) {
    throw new Error("RpcHttp: maxConcurrentRequests must be > 0");
  }
  let ongoingRequests = 0;
  const queue = new Array<() => void>();
  return async function (method, params) {
    if (ongoingRequests >= maxConcurrentRequests) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    ongoingRequests++;
    try {
      return await rpc(method, params);
    } finally {
      ongoingRequests--;
      queue.shift()?.();
    }
  };
}

export function rpcHttpWithRetryOnError(
  rpc: RpcHttp,
  nextRetryDelayMs: (retryCounter: number, lastError: unknown) => number,
): RpcHttp {
  return async function (method, params) {
    let retryCounter = 0;
    while (true) {
      try {
        return await rpc(method, params);
      } catch (error) {
        const delay = nextRetryDelayMs(retryCounter, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCounter++;
      }
    }
  };
}

let uniqueRequestId = 1;

const responseJsonType = jsonTypeObject({
  version: jsonTypeString(),
  id: jsonTypeNumber(),
  error: jsonTypeNullableToOptional(
    jsonTypeObject({
      code: jsonTypeNumber(),
      message: jsonTypeString(),
    }),
  ),
  result: jsonTypeValue(),
});
