import { JsonObject, JsonValue } from "../data/Json";
import { withContext } from "../utils";
import {
  IdlTypeFull,
  IdlTypeFullArray,
  IdlTypeFullEnum,
  IdlTypeFullFieldNamed,
  IdlTypeFullFields,
  IdlTypeFullFieldUnnamed,
  IdlTypeFullOption,
  IdlTypeFullPadded,
  IdlTypeFullString,
  IdlTypeFullStruct,
  IdlTypeFullTypedef,
  IdlTypeFullVec,
} from "./IdlTypeFull";
import { idlTypePrefixDeserialize } from "./IdlTypePrefix";
import {
  IdlTypePrimitive,
  idlTypePrimitiveDeserialize,
} from "./IdlTypePrimitive";

export function idlTypeFullDeserialize(
  typeFull: IdlTypeFull,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return typeFull.traverse(visitorDeserialize, data, dataOffset, undefined);
}

export function idlTypeFullFieldsDeserialize(
  typeFullFields: IdlTypeFullFields,
  data: DataView,
  dataOffset: number,
): [number, JsonValue] {
  return typeFullFields.traverse(
    visitorFieldsDeserialize,
    data,
    dataOffset,
    undefined,
  );
}

const visitorDeserialize = {
  typedef: (
    self: IdlTypeFullTypedef,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    return withContext(
      `Deserialize: Typedef: ${self.name} (offset: ${dataOffset})`,
      () => idlTypeFullDeserialize(self.content, data, dataOffset),
    );
  },
  option: (
    self: IdlTypeFullOption,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let [dataSize, dataPrefix] = idlTypePrefixDeserialize(
      self.prefix,
      data,
      dataOffset,
    );
    if ((dataPrefix & 1n) === 0n) {
      return [dataSize, null];
    }
    const dataContentOffset = dataOffset + dataSize;
    const [dataContentSize, dataContent] = idlTypeFullDeserialize(
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
    let [dataSize, dataPrefix] = idlTypePrefixDeserialize(
      self.prefix,
      data,
      dataOffset,
    );
    const dataLength = Number(dataPrefix);
    const dataItems = [];
    for (let i = 0; i < dataLength; i++) {
      const dataItemOffset = dataOffset + dataSize;
      const [dataItemSize, dataItem] = idlTypeFullDeserialize(
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
      const [dataItemSize, dataItem] = idlTypeFullDeserialize(
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
    let [dataSize, dataPrefix] = idlTypePrefixDeserialize(
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
    return idlTypeFullFieldsDeserialize(self.fields, data, dataOffset);
  },
  enum: (
    self: IdlTypeFullEnum,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    if (self.variants.length === 0) {
      return [0, null];
    }
    let enumMask = 0n;
    const codes = [];
    for (const variant of self.variants) {
      enumMask |= variant.code;
      codes.push(variant.code);
    }
    let [dataSize, dataPrefix] = idlTypePrefixDeserialize(
      self.prefix,
      data,
      dataOffset,
    );
    const dataVariantOffset = dataOffset + dataSize;
    for (const variant of self.variants) {
      if (variant.code === (dataPrefix & enumMask)) {
        if (variant.fields.isNothing()) {
          return [dataSize, variant.name];
        }
        const [dataVariantSize, dataVariant] = withContext(
          `Deserialize: Enum Variant: ${variant.name} (offset: ${dataVariantOffset})`,
          () =>
            idlTypeFullFieldsDeserialize(
              variant.fields,
              data,
              dataVariantOffset,
            ),
        );
        dataSize += dataVariantSize;
        return [dataSize, { [variant.name]: dataVariant }];
      }
    }
    throw new Error(
      `Deserialize: Unknown enum code: ${dataPrefix} (offset: ${dataOffset})`,
    );
  },
  padded: (
    self: IdlTypeFullPadded,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    let dataSize = self.before;
    const dataContentOffset = dataOffset + dataSize;
    const [dataContentSize, dataContent] = idlTypeFullDeserialize(
      self.content,
      data,
      dataContentOffset,
    );
    dataSize += Math.max(dataContentSize, self.minSize);
    dataSize += self.after;
    return [dataSize, dataContent];
  },
  primitive: (
    self: IdlTypePrimitive,
    data: DataView,
    dataOffset: number,
  ): [number, JsonValue] => {
    return idlTypePrimitiveDeserialize(self, data, dataOffset);
  },
};

const visitorFieldsDeserialize = {
  nothing: (
    _self: null,
    _data: DataView,
    _dataOffset: number,
  ): [number, JsonValue] => {
    return [0, null];
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
      const [dataFieldSize, dataField] = withContext(
        `Deserialize: Field: ${field.name} (offset: ${dataFieldOffset})`,
        () => idlTypeFullDeserialize(field.content, data, dataFieldOffset),
      );
      dataSize += dataFieldSize;
      dataFields[field.name] = dataField;
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
      const [dataFieldSize, dataField] = withContext(
        `Deserialize: Field: ${field.position} (offset: ${dataFieldOffset})`,
        () => idlTypeFullDeserialize(field.content, data, dataFieldOffset),
      );
      dataSize += dataFieldSize;
      dataFields.push(dataField);
    }
    return [dataSize, dataFields];
  },
};
