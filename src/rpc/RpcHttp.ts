import {
  JsonValue,
  jsonAsObject,
  jsonDecoderObject,
  jsonDecoderOptional,
  jsonTypeNumber,
  jsonTypeString,
  jsonTypeValue,
} from "../data/Json";
import { Commitment } from "./RpcTypes";

export type RpcHttp = (
  method: string,
  params: Array<JsonValue>,
) => Promise<JsonValue>;

export function rpcHttpFromUrl(
  url: string,
  defaultContext?: {
    commitment?: Commitment; // TODO - should this stay an object?
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
  return async function (method, params) {
    if (params.length <= 0) {
      throw new Error(`RpcHttp: Expected params array to not be empty`);
    }
    const defaultCommitment = defaultContext?.commitment;
    if (defaultCommitment !== undefined) {
      const paramsLastIndex = params.length - 1;
      const lastParamObject = jsonAsObject(params[paramsLastIndex]);
      if (lastParamObject !== undefined) {
        params = params.slice();
        params[paramsLastIndex] = {
          ...lastParamObject,
          preflightCommitment: defaultCommitment,
          commitment: defaultCommitment,
        };
      }
    }
    const requestId = uniqueRequestId++;
    const responseRaw = await (customFetch ?? fetch)(url, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }),
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
  return async function (method, params) {
    return await Promise.race<JsonValue>([
      rpcHttp(method, params),
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
  return async function (method, params) {
    if (ongoingRequests >= maxConcurrentRequests) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    ongoingRequests++;
    try {
      return await rpcHttp(method, params);
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
  return async function (method, params) {
    let startTime = Date.now();
    let retriedCounter = 0;
    while (true) {
      try {
        return await rpcHttp(method, params);
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
