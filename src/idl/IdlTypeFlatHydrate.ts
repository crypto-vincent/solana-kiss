import { IdlTypedef, idlTypedefGlobalsByName } from "./IdlTypedef";
import {
  IdlTypeFlat,
  IdlTypeFlatArray,
  IdlTypeFlatBlob,
  IdlTypeFlatConst,
  IdlTypeFlatDefined,
  IdlTypeFlatEnum,
  IdlTypeFlatFieldNamed,
  IdlTypeFlatFields,
  IdlTypeFlatFieldUnnamed,
  IdlTypeFlatGeneric,
  IdlTypeFlatOption,
  IdlTypeFlatPad,
  IdlTypeFlatString,
  IdlTypeFlatStruct,
  IdlTypeFlatVec,
} from "./IdlTypeFlat";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";
import { idlTypeFullTypedefBytemuck } from "./IdlTypeFullBytemuck";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

export function idlTypeFlatHydrate(
  typeFlat: IdlTypeFlat,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefs?: Map<string, IdlTypedef>,
): IdlTypeFull {
  const typeFullOrConstLiteral = idlTypeFlatHydrateOrConstLiteral(
    typeFlat,
    genericsBySymbol,
    typedefs,
  );
  if (typeof typeFullOrConstLiteral === "number") {
    throw new Error("Const is not supported as a standalone type");
  }
  return typeFullOrConstLiteral;
}

export function idlTypeFlatHydrateOrConstLiteral(
  typeFlat: IdlTypeFlat,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefs?: Map<string, IdlTypedef>,
): IdlTypeFull | number {
  return typeFlat.traverse(
    visitorHydrateOrConstLiteral,
    genericsBySymbol,
    typedefs,
  );
}

export function idlTypeFlatFieldsHydrate(
  typeFlatFields: IdlTypeFlatFields,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefs?: Map<string, IdlTypedef>,
): IdlTypeFullFields {
  return typeFlatFields.traverse(
    visitorHydrateFields,
    genericsBySymbol,
    typedefs,
  );
}

const visitorHydrateOrConstLiteral = {
  defined: (
    self: IdlTypeFlatDefined,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    const typedef = lookupTypedef(self.name, typedefs);
    if (typedef === undefined) {
      throw new Error(`Could not resolve typedef named: ${self.name}`);
    }
    if (self.generics.length < typedef.generics.length) {
      throw new Error("Insufficient set of generics");
    }
    const genericsFull = self.generics.map((genericFlat: IdlTypeFlat) => {
      return idlTypeFlatHydrateOrConstLiteral(
        genericFlat,
        genericsBySymbol,
        typedefs,
      );
    });
    const innerGenericsBySymbol = new Map<string, IdlTypeFull | number>();
    for (let i = 0; i < typedef.generics.length; i++) {
      innerGenericsBySymbol.set(typedef.generics[i]!, genericsFull[i]!);
    }
    const typeFull = idlTypeFlatHydrate(
      typedef.typeFlat,
      innerGenericsBySymbol,
      typedefs,
    );
    const typeTypedef = {
      name: typedef.name,
      repr: typedef.repr,
      content: typeFull,
    };
    if (
      typedef.serialization === "bytemuck" ||
      typedef.serialization === "bytemuckunsafe"
    ) {
      return idlTypeFullTypedefBytemuck(typeTypedef).value;
    }
    return IdlTypeFull.typedef(typeTypedef);
  },
  generic: (
    self: IdlTypeFlatGeneric,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    const typeFull = genericsBySymbol.get(self.symbol);
    if (typeFull === undefined) {
      throw new Error(`Could not resolve generic named: ${self.symbol}`);
    }
    return typeFull;
  },
  option: (
    self: IdlTypeFlatOption,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.option({
      prefix: self.prefix,
      content: idlTypeFlatHydrate(self.content, genericsBySymbol, typedefs),
    });
  },
  vec: (
    self: IdlTypeFlatVec,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.vec({
      prefix: self.prefix,
      items: idlTypeFlatHydrate(self.items, genericsBySymbol, typedefs),
    });
  },
  array: (
    self: IdlTypeFlatArray,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    const length = idlTypeFlatHydrateOrConstLiteral(
      self.length,
      genericsBySymbol,
      typedefs,
    );
    if (typeof length !== "number") {
      throw new Error("Array length must resolve to a const literal number");
    }
    return IdlTypeFull.array({
      length,
      items: idlTypeFlatHydrate(self.items, genericsBySymbol, typedefs),
    });
  },
  string: (
    self: IdlTypeFlatString,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.string({
      prefix: self.prefix,
    });
  },
  struct: (
    self: IdlTypeFlatStruct,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.struct({
      fields: idlTypeFlatFieldsHydrate(self.fields, genericsBySymbol, typedefs),
    });
  },
  enum: (
    self: IdlTypeFlatEnum,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.enum({
      prefix: self.prefix,
      mask: self.mask,
      indexByName: self.indexByName,
      indexByCodeBigInt: self.indexByCodeBigInt,
      indexByCodeString: self.indexByCodeString,
      variants: self.variants.map((variant) => ({
        name: variant.name,
        code: variant.code,
        fields: idlTypeFlatFieldsHydrate(
          variant.fields,
          genericsBySymbol,
          typedefs,
        ),
      })),
    });
  },
  pad: (
    self: IdlTypeFlatPad,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.pad({
      before: self.before,
      minSize: self.minSize,
      after: self.after,
      content: idlTypeFlatHydrate(self.content, genericsBySymbol, typedefs),
    });
  },
  blob: (
    self: IdlTypeFlatBlob,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.blob({ bytes: self.bytes });
  },
  const: (
    self: IdlTypeFlatConst,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return self.literal;
  },
  primitive: (
    self: IdlTypePrimitive,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFull | number => {
    return IdlTypeFull.primitive(self);
  },
};

const visitorHydrateFields = {
  nothing: (
    _self: null,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.nothing();
  },
  named: (
    self: Array<IdlTypeFlatFieldNamed>,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.named(
      self.map((field) => ({
        name: field.name,
        content: idlTypeFlatHydrate(field.content, genericsBySymbol, typedefs),
      })),
    );
  },
  unnamed: (
    self: Array<IdlTypeFlatFieldUnnamed>,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs?: Map<string, IdlTypedef>,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.unnamed(
      self.map((field, index) => ({
        position: index,
        content: idlTypeFlatHydrate(field.content, genericsBySymbol, typedefs),
      })),
    );
  },
};

function lookupTypedef(
  name: string,
  typedefs?: Map<string, IdlTypedef>,
): IdlTypedef | undefined {
  const typedefGlobal = idlTypedefGlobalsByName.get(name);
  if (typedefGlobal !== undefined) {
    return typedefGlobal;
  }
  if (typedefs === undefined) {
    throw new Error("Typedefs not available in this context");
  }
  return typedefs.get(name);
}
