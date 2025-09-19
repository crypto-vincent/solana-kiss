import {
  JsonValue,
  jsonExpectNumberFromObject,
  jsonExpectObject,
  jsonExpectStringFromObject,
  jsonExpectValueFromObject,
  jsonExpectValueShallowEquals,
} from "./json";

export type RpcHttp = (
  method: string,
  params: Array<any>,
) => Promise<JsonValue>;

export function rpcHttpFromUrl(
  url: string,
  // TODO - support custom fetch implementations (for environments that don't have fetch natively)
): RpcHttp {
  return async function (method, params) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const json = jsonExpectObject((await response.json()) as JsonValue);
    const version = jsonExpectStringFromObject(json, "jsonrpc");
    const id = jsonExpectNumberFromObject(json, "id");
    jsonExpectValueShallowEquals(version, "2.0");
    jsonExpectValueShallowEquals(id, 1);
    if (json["error"]) {
      const error = jsonExpectObject(json["error"]);
      const errorCode = jsonExpectNumberFromObject(error, "code");
      const errorMessage = jsonExpectStringFromObject(error, "message");
      throw new Error(`RpcHttp: Error ${errorCode}: ${errorMessage}`);
    }
    return jsonExpectValueFromObject(json, "result");
  };
}

// TODO - is that sufficient ? where should this be located
export function rpcHttpThrottledRequestsInParallel(
  rpc: RpcHttp,
  requestsInParallel: number,
): RpcHttp {
  if (requestsInParallel <= 0) {
    throw new Error("RpcHttp: requestsInParallel must be > 0");
  }
  let ongoingRequests = 0;
  let queue = new Array<() => void>();
  return async function (method, params) {
    if (ongoingRequests >= requestsInParallel) {
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

// TODO - add a request per second limiter
// TODO - add a retry layer somehow ?
