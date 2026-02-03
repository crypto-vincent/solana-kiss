import { casingLosslessConvertToCamel } from "../data/Casing";
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
  IdlTypeFlatLoop,
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
  self: IdlTypeFlat,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefs: Map<string, IdlTypedef> | null,
): IdlTypeFull {
  const typeFullOrConstLiteral = idlTypeFlatHydrateOrConstLiteral(
    self,
    genericsBySymbol,
    typedefs,
  );
  if (typeof typeFullOrConstLiteral === "number") {
    throw new Error("Const is not supported as a standalone type");
  }
  return typeFullOrConstLiteral;
}

export function idlTypeFlatHydrateOrConstLiteral(
  self: IdlTypeFlat,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefs: Map<string, IdlTypedef> | null,
): IdlTypeFull | number {
  return self.traverse(
    visitorHydrateOrConstLiteral,
    genericsBySymbol,
    typedefs,
  );
}

export function idlTypeFlatFieldsHydrate(
  self: IdlTypeFlatFields,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefs: Map<string, IdlTypedef> | null,
): IdlTypeFullFields {
  return self.traverse(visitorHydrateFields, genericsBySymbol, typedefs);
}

const visitorHydrateOrConstLiteral = {
  defined: (
    self: IdlTypeFlatDefined,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
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
    _typedefs: Map<string, IdlTypedef> | null,
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
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.option({
      prefix: self.prefix,
      content: idlTypeFlatHydrate(self.content, genericsBySymbol, typedefs),
    });
  },
  vec: (
    self: IdlTypeFlatVec,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.vec({
      prefix: self.prefix,
      items: idlTypeFlatHydrate(self.items, genericsBySymbol, typedefs),
    });
  },
  loop: (
    self: IdlTypeFlatLoop,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.loop({
      items: idlTypeFlatHydrate(self.items, genericsBySymbol, typedefs),
      stop: self.stop,
    });
  },
  array: (
    self: IdlTypeFlatArray,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
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
    _typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.string({
      prefix: self.prefix,
    });
  },
  struct: (
    self: IdlTypeFlatStruct,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.struct({
      fields: idlTypeFlatFieldsHydrate(self.fields, genericsBySymbol, typedefs),
    });
  },
  enum: (
    self: IdlTypeFlatEnum,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    let variants = self.variants.map((variant, variantIndex) => {
      const code = variant.code ?? BigInt(variantIndex);
      return {
        name: variant.name ?? String(code),
        code,
        fields: idlTypeFlatFieldsHydrate(
          variant.fields,
          genericsBySymbol,
          typedefs,
        ),
      };
    });
    variants.sort((a, b) => {
      if (a.code < b.code) {
        return -1;
      }
      if (a.code > b.code) {
        return 1;
      }
      return 0;
    });
    let mask = 0n;
    for (const variant of variants) {
      mask |= variant.code;
    }
    const indexByName = new Map<string, number>();
    const indexByCodeBigInt = new Map<bigint, number>();
    const indexByCodeString = new Map<string, number>();
    for (let variantIndex = 0; variantIndex < variants.length; variantIndex++) {
      const variant = variants[variantIndex]!;
      if (indexByName.has(variant.name)) {
        throw new Error(`Duplicate enum variant name: ${variant.name}`);
      }
      if (indexByCodeBigInt.has(variant.code)) {
        throw new Error(`Duplicate enum variant code: ${variant.code}`);
      }
      if (indexByCodeString.has(variant.code.toString())) {
        throw new Error(`Duplicate enum variant code: ${variant.code}`);
      }
      indexByName.set(variant.name, variantIndex);
      indexByCodeBigInt.set(variant.code, variantIndex);
      indexByCodeString.set(variant.code.toString(), variantIndex);
    }
    return IdlTypeFull.enum({
      prefix: self.prefix,
      mask,
      indexByName,
      indexByCodeBigInt,
      indexByCodeString,
      variants,
    });
  },
  pad: (
    self: IdlTypeFlatPad,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.pad({
      before: self.before,
      end: self.end,
      content: idlTypeFlatHydrate(self.content, genericsBySymbol, typedefs),
    });
  },
  blob: (
    self: IdlTypeFlatBlob,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.blob({ bytes: self.bytes });
  },
  const: (
    self: IdlTypeFlatConst,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return self.literal;
  },
  primitive: (
    self: IdlTypePrimitive,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.primitive(self);
  },
};

const visitorHydrateFields = {
  nothing: (
    _self: null,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.nothing();
  },
  named: (
    self: Array<IdlTypeFlatFieldNamed>,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.named(
      self.map((field) => ({
        name: casingLosslessConvertToCamel(field.name),
        content: idlTypeFlatHydrate(field.content, genericsBySymbol, typedefs),
      })),
    );
  },
  unnamed: (
    self: Array<IdlTypeFlatFieldUnnamed>,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefs: Map<string, IdlTypedef> | null,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.unnamed(
      self.map((field) => ({
        content: idlTypeFlatHydrate(field.content, genericsBySymbol, typedefs),
      })),
    );
  },
};

function lookupTypedef(
  name: string,
  typedefs: Map<string, IdlTypedef> | null,
): IdlTypedef | undefined {
  const typedefGlobal = idlTypedefGlobalsByName.get(name);
  if (typedefGlobal !== undefined) {
    return typedefGlobal;
  }
  if (typedefs === null) {
    throw new Error("Typedefs not available in this context");
  }
  return typedefs.get(name);
}
