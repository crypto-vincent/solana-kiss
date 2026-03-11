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
  IdlTypeFlatPadded,
  IdlTypeFlatString,
  IdlTypeFlatStruct,
  IdlTypeFlatVec,
} from "./IdlTypeFlat";
import { IdlTypeFull, IdlTypeFullFields } from "./IdlTypeFull";
import { idlTypeFullTypedefBytemuck } from "./IdlTypeFullBytemuck";
import { IdlTypePrimitive } from "./IdlTypePrimitive";

/**
 * Hydrates a flat IDL type into a fully-resolved full type by linking all
 * typedef references. Throws if a const literal is encountered at the top
 * level (use {@link idlTypeFlatHydrateOrConstLiteral} for those cases).
 *
 * @param self - The unresolved flat IDL type to hydrate.
 * @param genericsBySymbol - Map of generic symbol names to their resolved full types or numeric const literals.
 * @param typedefsByName - Map of typedef names to their definitions, or `null` if typedefs are not available in this context.
 * @returns The fully-resolved {@link IdlTypeFull}.
 */
export function idlTypeFlatHydrate(
  self: IdlTypeFlat,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefsByName: Map<string, IdlTypedef> | null,
): IdlTypeFull {
  const typeFullOrConstLiteral = idlTypeFlatHydrateOrConstLiteral(
    self,
    genericsBySymbol,
    typedefsByName,
  );
  if (typeof typeFullOrConstLiteral === "number") {
    throw new Error("Const is not supported as a standalone type");
  }
  return typeFullOrConstLiteral;
}

/**
 * Hydrates a flat IDL type into a fully-resolved full type or a numeric const
 * literal. Use this variant when the type node may represent a compile-time
 * constant (e.g., an array length generic).
 *
 * @param self - The unresolved flat IDL type to hydrate.
 * @param genericsBySymbol - Map of generic symbol names to their resolved full types or numeric const literals.
 * @param typedefsByName - Map of typedef names to their definitions, or `null` if typedefs are not available in this context.
 * @returns The fully-resolved {@link IdlTypeFull}, or a `number` if the node is a const literal.
 */
export function idlTypeFlatHydrateOrConstLiteral(
  self: IdlTypeFlat,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefsByName: Map<string, IdlTypedef> | null,
): IdlTypeFull | number {
  return self.traverse(
    visitorHydrateOrConstLiteral,
    genericsBySymbol,
    typedefsByName,
  );
}

/**
 * Hydrates a set of flat IDL fields into fully-resolved full fields by linking
 * all typedef references within each field's type.
 *
 * @param self - The unresolved flat IDL fields to hydrate.
 * @param genericsBySymbol - Map of generic symbol names to their resolved full types or numeric const literals.
 * @param typedefsByName - Map of typedef names to their definitions, or `null` if typedefs are not available in this context.
 * @returns The fully-resolved {@link IdlTypeFullFields}.
 */
export function idlTypeFlatFieldsHydrate(
  self: IdlTypeFlatFields,
  genericsBySymbol: Map<string, IdlTypeFull | number>,
  typedefsByName: Map<string, IdlTypedef> | null,
): IdlTypeFullFields {
  return self.traverse(visitorHydrateFields, genericsBySymbol, typedefsByName);
}

const visitorHydrateOrConstLiteral = {
  defined: (
    self: IdlTypeFlatDefined,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    const typedef = lookupTypedef(self.name, typedefsByName);
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
        typedefsByName,
      );
    });
    const innerGenericsBySymbol = new Map<string, IdlTypeFull | number>();
    for (let i = 0; i < typedef.generics.length; i++) {
      innerGenericsBySymbol.set(typedef.generics[i]!, genericsFull[i]!);
    }
    const typeFull = idlTypeFlatHydrate(
      typedef.typeFlat,
      innerGenericsBySymbol,
      typedefsByName,
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
    _typedefsByName: Map<string, IdlTypedef> | null,
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
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.option({
      prefix: self.prefix,
      content: idlTypeFlatHydrate(
        self.content,
        genericsBySymbol,
        typedefsByName,
      ),
    });
  },
  vec: (
    self: IdlTypeFlatVec,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.vec({
      prefix: self.prefix,
      items: idlTypeFlatHydrate(self.items, genericsBySymbol, typedefsByName),
    });
  },
  loop: (
    self: IdlTypeFlatLoop,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.loop({
      items: idlTypeFlatHydrate(self.items, genericsBySymbol, typedefsByName),
      stop: self.stop,
    });
  },
  array: (
    self: IdlTypeFlatArray,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    const length = idlTypeFlatHydrateOrConstLiteral(
      self.length,
      genericsBySymbol,
      typedefsByName,
    );
    if (typeof length !== "number") {
      throw new Error("Array length must resolve to a const literal number");
    }
    return IdlTypeFull.array({
      length,
      items: idlTypeFlatHydrate(self.items, genericsBySymbol, typedefsByName),
    });
  },
  string: (
    self: IdlTypeFlatString,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.string({ prefix: self.prefix });
  },
  struct: (
    self: IdlTypeFlatStruct,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.struct({
      fields: idlTypeFlatFieldsHydrate(
        self.fields,
        genericsBySymbol,
        typedefsByName,
      ),
    });
  },
  enum: (
    self: IdlTypeFlatEnum,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    let variants = self.variants.map((variant, variantIndex) => {
      const code = variant.code ?? BigInt(variantIndex);
      return {
        name: variant.name ?? String(code),
        code,
        fields: idlTypeFlatFieldsHydrate(
          variant.fields,
          genericsBySymbol,
          typedefsByName,
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
    let fieldless = true;
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
      if (!variant.fields.isNothing()) {
        fieldless = false;
      }
    }
    return IdlTypeFull.enum({
      prefix: self.prefix,
      mask,
      indexByName,
      indexByCodeBigInt,
      indexByCodeString,
      fieldless,
      variants,
    });
  },
  padded: (
    self: IdlTypeFlatPadded,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.padded({
      before: self.before,
      end: self.end,
      content: idlTypeFlatHydrate(
        self.content,
        genericsBySymbol,
        typedefsByName,
      ),
    });
  },
  blob: (
    self: IdlTypeFlatBlob,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.blob({ bytes: self.bytes });
  },
  const: (
    self: IdlTypeFlatConst,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return self.literal;
  },
  primitive: (
    self: IdlTypePrimitive,
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFull | number => {
    return IdlTypeFull.primitive(self);
  },
};

const visitorHydrateFields = {
  nothing: (
    _self: {},
    _genericsBySymbol: Map<string, IdlTypeFull | number>,
    _typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.nothing();
  },
  named: (
    self: Array<IdlTypeFlatFieldNamed>,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.named(
      self.map((field) => ({
        name: casingLosslessConvertToCamel(field.name),
        content: idlTypeFlatHydrate(
          field.content,
          genericsBySymbol,
          typedefsByName,
        ),
      })),
    );
  },
  unnamed: (
    self: Array<IdlTypeFlatFieldUnnamed>,
    genericsBySymbol: Map<string, IdlTypeFull | number>,
    typedefsByName: Map<string, IdlTypedef> | null,
  ): IdlTypeFullFields => {
    return IdlTypeFullFields.unnamed(
      self.map((field) => ({
        content: idlTypeFlatHydrate(
          field.content,
          genericsBySymbol,
          typedefsByName,
        ),
      })),
    );
  },
};

function lookupTypedef(
  name: string,
  typedefsByName: Map<string, IdlTypedef> | null,
): IdlTypedef | undefined {
  const typedefGlobal = idlTypedefGlobalsByName.get(name);
  if (typedefGlobal !== undefined) {
    return typedefGlobal;
  }
  if (typedefsByName === null) {
    throw new Error("Typedefs not available in this context");
  }
  return typedefsByName.get(name);
}
