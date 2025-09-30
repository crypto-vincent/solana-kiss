import {
  JsonValue,
  jsonTypeNumber,
  jsonTypeObject,
  jsonTypeOptional,
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
    const responseJson = (await responseRaw.json()) as JsonValue;
    console.log("responseJson", responseJson);
    const response = responseJsonType.decode(responseJson);
    if (response.jsonrpc !== "2.0") {
      throw new Error(
        `RpcHttp: Expected response jsonrpc: "2.0" (found: "${response.jsonrpc}")`,
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
  nextRetryDelayMs: (retryCount: number, error: any) => number,
): RpcHttp {
  return async function (method, params) {
    let retryCount = 0;
    while (true) {
      try {
        return await rpc(method, params);
      } catch (error) {
        const delay = nextRetryDelayMs(retryCount, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCount++;
      }
    }
  };
}

let uniqueRequestId = 1;

const responseJsonType = jsonTypeObject({
  jsonrpc: jsonTypeString(),
  id: jsonTypeNumber(),
  error: jsonTypeOptional(
    jsonTypeObject({
      code: jsonTypeNumber(),
      message: jsonTypeString(),
    }),
  ),
  result: jsonTypeOptional(jsonTypeValue()),
});
