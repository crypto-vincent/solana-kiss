import { Rpc } from './types';
import {
  enforceNumber,
  enforceObject,
  enforceString,
  expectEqual,
  isArray,
} from './utils';

export function rpcFromUrl(
  url: string,
  // TODO - support custom fetch implementations (for environments that don't have fetch natively)
): Rpc {
  return async function (method, params) {
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    let json = enforceObject(await response.json());
    expectEqual(enforceString(json.jsonrpc), '2.0');
    expectEqual(enforceNumber(json.id), 1);
    if (json.error) {
      let error = enforceObject(json.error);
      throw new Error(
        `Error ${enforceNumber(error.code)}: ${enforceString(error.message)}`,
      );
    }
    if (isArray(json.result)) {
      return json.result;
    }
    const result = enforceObject(json.result);
    const context = enforceObject(result.context);
    // TODO - do something with context.slot ?
    return result.value;
  };
}
