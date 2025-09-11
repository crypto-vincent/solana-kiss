import { Lamports } from './types';

export function valueType(value: any): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}
export function valuePreview(value: any): string {
  const stringify = '' + value;
  if (stringify.length > 30) {
    return stringify.slice(0, 37) + '...';
  }
  return stringify;
}

export function isObject(value: any): boolean {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}
export function isArray(value: any): boolean {
  return Array.isArray(value);
}
export function isString(value: any): boolean {
  return typeof value === 'string' || value instanceof String;
}
export function isNumber(value: any): boolean {
  return typeof value === 'number' || value instanceof Number;
}
export function isBigInt(value: any): boolean {
  return typeof value === 'bigint' || value instanceof BigInt;
}
export function isBoolean(value: any): boolean {
  return typeof value === 'boolean' || value instanceof Boolean;
}

export function enforceObject(value: any): Record<string, any> {
  if (!isObject(value)) {
    throw new Error(
      `Expected an object (found ${valueType(value)}: ${valuePreview(value)})`,
    );
  }
  return value;
}
export function enforceArray(value: any): any[] {
  if (!isArray(value)) {
    throw new Error(
      `Expected an array (found ${valueType(value)}: ${valuePreview(value)})`,
    );
  }
  return value;
}
export function enforceString(value: any): string {
  if (!isString(value)) {
    throw new Error(
      `Expected a string (found ${valueType(value)}: ${valuePreview(value)})`,
    );
  }
  return value;
}
export function enforceNumber(value: any): number {
  if (!isNumber(value)) {
    throw new Error(
      `Expected a number (found ${valueType(value)}: ${valuePreview(value)})`,
    );
  }
  return value;
}
export function enforceBigInt(value: any): bigint {
  if (!isBigInt(value)) {
    throw new Error(
      `Expected a bigint (found ${valueType(value)}: ${valuePreview(value)})`,
    );
  }
  return value;
}
export function enforceBoolean(value: any): boolean {
  if (!isBoolean(value)) {
    throw new Error(
      `Expected a boolean (found ${valueType(value)}: ${valuePreview(value)})`,
    );
  }
  return value;
}

export function expectEqual<T>(found: T, expected: T) {
  if (found !== expected) {
    throw new Error(
      `Expected ${expected} (found ${valueType(found)}: ${valuePreview(found)})`,
    );
  }
  return found;
}

export function approximateSolsForLamports(lamports: Lamports): number {
  return Number(lamports) / Number(1_000_000_000);
}
