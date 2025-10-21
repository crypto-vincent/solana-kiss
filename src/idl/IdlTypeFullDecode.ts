import { JsonObject, JsonValue } from "../data/Json";
import { withErrorContext } from "../data/Utils";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullBlob,
  IdlTypeFullEnum,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullOption,
  IdlTypeFullPad,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { idlTypePrefixDecode } from "./IdlTypePrefix";
import { IdlTypePrimitive, idlTypePrimitiveDecode } from "./IdlTypePrimitive";

export function idlTypeFullDecode(
  typeFull: IdlTypeFull,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return typeFull.traverse(visitorDecode, data, dataOffset, undefined);
}

export function idlTypeFullFieldsDecode(
  typeFullFields: IdlTypeFullFields,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return typeFullFields.traverse(
    visitorFieldsDecode,
    data,
    dataOffset,
    undefined,
  );
}

const visitorDecode = {
  typedef: (
    self: IdlTypeFullTypedef,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    return withErrorContext(
      `Decode: Typedef: ${self.name} (offset: ${dataOffset})`,
      () => idlTypeFullDecode(self.content, data, dataOffset),
    );
  },
  option: (
    self: IdlTypeFullOption,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix,
      data,
      dataOffset,
    );
    if ((dataPrefix & 1n) === 0n) {
      return [dataSize, null];
    }
    const dataContentOffset = dataOffset + dataSize;
    const [dataContentSize, dataContent] = idlTypeFullDecode(
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
    dataOffset: number,
  ): [number, JsonValue] => {
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix,
      data,
      dataOffset,
    );
    const dataLength = Number(dataPrefix);
    const dataItems = [];
    for (let i = 0; i < dataLength; i++) {
      const dataItemOffset = dataOffset + dataSize;
      const [dataItemSize, dataItem] = idlTypeFullDecode(
        self.items,
        data,
        dataItemOffset,
      );
      dataSize += dataItemSize;
      dataItems.push(dataItem);
    }
    return [dataSize, dataItems];
  },
  array: (
    self: IdlTypeFullArray,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let dataSize = 0;
    const dataItems = [];
    for (let i = 0; i < self.length; i++) {
      const dataItemOffset = dataOffset + dataSize;
      const [dataItemSize, dataItem] = idlTypeFullDecode(
        self.items,
        data,
        dataItemOffset,
      );
      dataSize += dataItemSize;
      dataItems.push(dataItem);
    }
    return [dataSize, dataItems];
  },
  string: (
    self: IdlTypeFullString,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix,
      data,
      dataOffset,
    );
    const dataLength = Number(dataPrefix);
    const dataCharsOffset = dataOffset + dataSize;
    const dataBytes = new Uint8Array(data.buffer, dataCharsOffset, dataLength);
    const dataString = new TextDecoder("utf8").decode(dataBytes);
    dataSize += dataLength;
    return [dataSize, dataString];
  },
  struct: (
    self: IdlTypeFullStruct,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    return idlTypeFullFieldsDecode(self.fields, data, dataOffset);
  },
  enum: (
    self: IdlTypeFullEnum,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    if (self.variants.length === 0) {
      return [0, null];
    }
    let [dataSize, dataPrefix] = idlTypePrefixDecode(
      self.prefix,
      data,
      dataOffset,
    );
    const dataCode = dataPrefix & self.mask;
    const dataVariantOffset = dataOffset + dataSize;
    const variantIndex = self.indexByCodeBigInt.get(dataCode);
    if (variantIndex === undefined) {
      throw new Error(
        `Decode: Unknown enum code: ${dataCode} (offset: ${dataOffset})`,
      );
    }
    const variant = self.variants[variantIndex]!;
    const [dataVariantSize, dataVariant] = withErrorContext(
      `Decode: Enum Variant: ${variant.name} (offset: ${dataVariantOffset})`,
      () => idlTypeFullFieldsDecode(variant.fields, data, dataVariantOffset),
    );
    dataSize += dataVariantSize;
    if (dataVariant === undefined || dataVariant === null) {
      return [dataSize, variant.name];
    } else {
      return [dataSize, { [variant.name]: dataVariant }];
    }
  },
  pad: (
    self: IdlTypeFullPad,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let dataSize = self.before;
    const dataContentOffset = dataOffset + dataSize;
    const [dataContentSize, dataContent] = idlTypeFullDecode(
      self.content,
      data,
      dataContentOffset,
    );
    dataSize += Math.max(dataContentSize, self.minSize);
    dataSize += self.after;
    return [dataSize, dataContent];
  },
  blob: (
    self: IdlTypeFullBlob,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    for (
      let expectedIndex = 0;
      expectedIndex < self.bytes.length;
      expectedIndex++
    ) {
      const foundIndex = dataOffset + expectedIndex;
      const expectedByte = self.bytes[expectedIndex];
      const foundByte = data.getUint8(foundIndex);
      if (foundByte !== expectedByte) {
        throw new Error(
          `Decode: Expected byte ${expectedByte} at blob index ${expectedIndex} (offset ${foundIndex}, found: ${foundByte})`,
        );
      }
    }
    return [self.bytes.length, undefined];
  },
  primitive: (
    self: IdlTypePrimitive,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    return idlTypePrimitiveDecode(self, data, dataOffset);
  },
};

const visitorFieldsDecode = {
  nothing: (
    _self: null,
    _data: DataView,
    _dataOffset: number,
  ): [number, JsonValue] => {
    return [0, undefined];
  },
  named: (
    self: Array<IdlTypeFullFieldNamed>,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let dataSize = 0;
    const dataFields: JsonObject = {};
    for (const field of self) {
      const dataFieldOffset = dataOffset + dataSize;
      const [dataFieldSize, dataField] = withErrorContext(
        `Decode: Field: ${field.name} (offset: ${dataFieldOffset})`,
        () => idlTypeFullDecode(field.content, data, dataFieldOffset),
      );
      dataSize += dataFieldSize;
      if (dataField !== undefined) {
        dataFields[field.name] = dataField;
      }
    }
    return [dataSize, dataFields];
  },
  unnamed: (
    self: Array<IdlTypeFullFieldUnnamed>,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let dataSize = 0;
    const dataFields = new Array<JsonValue>();
    for (const field of self) {
      const dataFieldOffset = dataOffset + dataSize;
      const [dataFieldSize, dataField] = withErrorContext(
        `Decode: Field: ${field.position} (offset: ${dataFieldOffset})`,
        () => idlTypeFullDecode(field.content, data, dataFieldOffset),
      );
      dataSize += dataFieldSize;
      dataFields.push(dataField);
    }
    return [dataSize, dataFields];
  },
};
