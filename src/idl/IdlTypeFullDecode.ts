import { ErrorStack, withErrorContext } from "../data/Error";
import {
  JsonArray,
  jsonIsDeepEqual,
  JsonObject,
  JsonValue,
} from "../data/Json";
import { utf8Decode } from "../data/Utf8";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullLoop,
  IdlTypeFullOption,
  IdlTypeFullPadded,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTrial,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import {
  idlTypePrefixDecode,
  idlTypePrefixDefaultEnum,
  idlTypePrefixDefaultOption,
  idlTypePrefixDefaultString,
  idlTypePrefixDefaultVec,
} from "./IdlTypePrefix";
import { IdlTypePrimitive, idlTypePrimitiveDecode } from "./IdlTypePrimitive";

/**
 * Decodes a byte array into a JSON-compatible value.
 * @param self - Full IDL type describing the binary layout.
 * @param data - Raw binary buffer.
 * @param offset - Byte offset to start reading.
 * @returns Tuple of `[bytesConsumed, decodedJsonValue]`.
 */
export function idlTypeFullDecode(
  self: IdlTypeFull,
  data: DataView,
  offset: number,
): [number, JsonValue] {
  return withErrorContext(`Idl: Decode (offset: ${offset})`, () =>
    visit(self, data, offset),
  );
}

function visit(self: IdlTypeFull, data: DataView, offset: number) {
  return self.traverse(visitor, data, offset, null);
}

function visitFields(self: IdlTypeFullFields, data: DataView, offset: number) {
  return self.traverse(visitorFields, data, offset, null);
}

const visitor = {
  typedef: (
    self: IdlTypeFullTypedef,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    return withErrorContext(`Typedef: ${self.name} (offset: ${offset})`, () =>
      visit(self.content, data, offset),
    );
  },
  option: (
    self: IdlTypeFullOption,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix ?? idlTypePrefixDefaultOption,
      data,
      offset,
    );
    if ((dataPrefix & 1n) === 0n) {
      return [dataSize, null];
    }
    const dataContentOffset = offset + dataSize;
    const [dataContentSize, dataContent] = visit(
      self.content,
      data,
      dataContentOffset,
    );
    dataSize += dataContentSize;
    return [dataSize, dataContent];
  },
  vec: (
    self: IdlTypeFullVec,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix ?? idlTypePrefixDefaultVec,
      data,
      offset,
    );
    const dataLength = Number(dataPrefix);
    const dataItems = [];
    for (let i = 0; i < dataLength; i++) {
      const dataItemOffset = offset + dataSize;
      const [dataItemSize, dataItem] = visit(self.items, data, dataItemOffset);
      dataSize += dataItemSize;
      dataItems.push(dataItem);
    }
    return [dataSize, dataItems];
  },
  loop: (
    self: IdlTypeFullLoop,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    let dataSize = 0;
    const dataItems = [];
    while (true) {
      const dataItemOffset = offset + dataSize;
      if (self.stop === "end" && data.byteLength === dataItemOffset) {
        return [dataSize, dataItems];
      }
      const [dataItemSize, dataItem] = visit(self.items, data, dataItemOffset);
      dataSize += dataItemSize;
      if (self.stop !== "end") {
        if (jsonIsDeepEqual(dataItem, self.stop.value)) {
          return [dataSize, dataItems];
        }
      }
      dataItems.push(dataItem);
    }
  },
  array: (
    self: IdlTypeFullArray,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    let dataSize = 0;
    const dataItems = [];
    for (let i = 0; i < self.length; i++) {
      const dataItemOffset = offset + dataSize;
      const [dataItemSize, dataItem] = visit(self.items, data, dataItemOffset);
      dataSize += dataItemSize;
      dataItems.push(dataItem);
    }
    return [dataSize, dataItems];
  },
  string: (
    self: IdlTypeFullString,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix ?? idlTypePrefixDefaultString,
      data,
      offset,
    );
    const dataLength = Number(dataPrefix);
    const dataCharsOffset = offset + dataSize;
    const dataBytes = new Uint8Array(data.buffer, dataCharsOffset, dataLength);
    const dataString = utf8Decode(dataBytes);
    dataSize += dataLength;
    return [dataSize, dataString];
  },
  struct: (
    self: IdlTypeFullStruct,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    return visitFields(self.fields, data, offset);
  },
  enum: (
    self: IdlTypeFullEnum,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    if (self.variants.length === 0) {
      return [0, null];
    }
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix ?? idlTypePrefixDefaultEnum,
      data,
      offset,
    );
    const dataCode = dataPrefix & self.mask;
    const dataVariantOffset = offset + dataSize;
    const variantIndex = self.indexByCodeBigInt.get(dataCode);
    if (variantIndex === undefined) {
      throw new Error(`Unknown enum code: ${dataCode} (offset: ${offset})`);
    }
    const variant = self.variants[variantIndex]!;
    const [dataVariantSize, dataVariant] = withErrorContext(
      `Enum Variant: ${variant.name} (offset: ${dataVariantOffset})`,
      () => visitFields(variant.fields, data, dataVariantOffset),
    );
    dataSize += dataVariantSize;
    if (self.fieldless) {
      return [dataSize, variant.name];
    } else {
      return [dataSize, { [variant.name]: dataVariant }];
    }
  },
  trial: (
    self: IdlTypeFullTrial,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    const errors = [];
    for (const candidate of self.candidates) {
      try {
        const [dataSize, dataValue] = visit(candidate.content, data, offset);
        return [dataSize, { [candidate.name]: dataValue }];
      } catch (error) {
        errors.push(error);
      }
    }
    throw new ErrorStack(
      `First: No matching candidate (offset: ${offset})`,
      errors,
    );
  },
  padded: (
    self: IdlTypeFullPadded,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    const [dataContentSize, dataContent] = visit(
      self.content,
      data,
      offset + self.before,
    );
    const dataSize = self.before + Math.max(dataContentSize, self.minSize);
    return [dataSize, dataContent];
  },
  blob: (
    self: IdlTypeFullBlob,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    for (
      let expectedIndex = 0;
      expectedIndex < self.bytes.length;
      expectedIndex++
    ) {
      const foundIndex = offset + expectedIndex;
      const expectedByte = self.bytes[expectedIndex];
      const foundByte = data.getUint8(foundIndex);
      if (foundByte !== expectedByte) {
        throw new Error(
          `Expected byte ${expectedByte} at blob index ${expectedIndex} (offset ${foundIndex}, found: ${foundByte})`,
        );
      }
    }
    return [self.bytes.length, null];
  },
  primitive: (
    self: IdlTypePrimitive,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    return idlTypePrimitiveDecode(self, data, offset);
  },
};

const visitorFields = {
  nothing: (
    _self: Array<never>,
    _data: DataView,
    _offset: number,
  ): [number, JsonValue] => {
    return [0, null];
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    let dataSize = 0;
    const dataFields = {} as JsonObject;
    for (const field of self) {
      const dataFieldOffset = offset + dataSize;
      const [dataFieldSize, dataField] = withErrorContext(
        `Field: ${field.name} (offset: ${dataFieldOffset})`,
        () => visit(field.content, data, dataFieldOffset),
      );
      dataSize += dataFieldSize;
      dataFields[field.name] = dataField;
    }
    return [dataSize, dataFields];
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    data: DataView,
    offset: number,
  ): [number, JsonValue] => {
    let dataSize = 0;
    const dataFields = [] as JsonArray;
    for (let index = 0; index < self.length; index++) {
      const field = self[index]!;
      const dataFieldOffset = offset + dataSize;
      const [dataFieldSize, dataField] = withErrorContext(
        `Field: Unamed: ${index} (offset: ${dataFieldOffset})`,
        () => visit(field.content, data, dataFieldOffset),
      );
      dataSize += dataFieldSize;
      dataFields.push(dataField);
    }
    return [dataSize, dataFields];
  },
};
