import { RpcHttp } from './types';
import {
  JsonValue,
  expectJsonObject,
  expectJsonStringFromObject,
  expectJsonNumberFromObject,
  expectJsonValueFromObject,
  expectJsonValueShallowEquals,
} from './json';

export function rpcFromUrl(
  url: string,
  // TODO - support custom fetch implementations (for environments that don't have fetch natively)
): RpcHttp {
  return async function (method, params) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = expectJsonObject((await response.json()) as JsonValue);
    const version = expectJsonStringFromObject(json, 'jsonrpc');
    const id = expectJsonNumberFromObject(json, 'id');
    expectJsonValueShallowEquals(version, '2.0');
    expectJsonValueShallowEquals(id, 1);
    if (json['error']) {
      const error = expectJsonObject(json['error']);
      const errorCode = expectJsonNumberFromObject(error, 'code');
      const errorMessage = expectJsonStringFromObject(error, 'message');
      throw new Error(`Rpc error ${errorCode}: ${errorMessage}`);
    }
    return expectJsonValueFromObject(json, 'result');
  };
}

// TODO - is that sufficient ? where should this be located
export function rpcThrottledRequestsInParallel(
  rpc: RpcHttp,
  requestsInParallel: number,
): RpcHttp {
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
