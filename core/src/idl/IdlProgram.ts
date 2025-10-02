import { camelCaseToSnakeCase } from "../data/Casing";
import {
  Decode,
  jsonAsArray,
  jsonAsObject,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderMap,
  jsonDecoderMerged,
  jsonDecoderObject,
  jsonDecoderObjectToMap,
  jsonDecodeString,
  jsonExpectObject,
  jsonExpectString,
  JsonObject,
  JsonValue,
} from "../data/Json";
import { Input } from "../data/Onchain";
import { Immutable } from "../data/Utils";
import { IdlAccount, idlAccountCheck, idlAccountParse } from "./IdlAccount";
import { IdlError, idlErrorDecode } from "./IdlError";
import { IdlEvent, idlEventCheck, idlEventParse } from "./IdlEvent";
import {
  IdlInstruction,
  idlInstructionCheck,
  idlInstructionParse,
} from "./IdlInstruction";
import { IdlMetadata, idlMetadataDecode } from "./IdlMetadata";
import { IdlTypedef, idlTypedefParse } from "./IdlTypedef";

export type IdlProgram = {
  metadata: IdlMetadata;
  typedefs: Map<string, IdlTypedef>;
  accounts: Map<string, IdlAccount>;
  instructions: Map<string, IdlInstruction>;
  events: Map<string, IdlEvent>;
  errors: Map<string, IdlError>;
};

export const idlProgramUnknown: Immutable<IdlProgram> = {
  metadata: {},
  typedefs: new Map(),
  accounts: new Map(),
  instructions: new Map(),
  events: new Map(),
  errors: new Map(),
};

export function idlProgramGuessAccount(
  programIdl: IdlProgram,
  accountData: Uint8Array,
): IdlAccount | undefined {
  for (const accountIdl of programIdl.accounts.values()) {
    try {
      idlAccountCheck(accountIdl, accountData);
      return accountIdl;
    } catch {}
  }
  return undefined;
}

export function idlProgramGuessInstruction(
  programIdl: IdlProgram,
  instructionInputs: Array<Input>,
  instructionData: Uint8Array,
): IdlInstruction | undefined {
  for (const instructionIdl of programIdl.instructions.values()) {
    try {
      idlInstructionCheck(instructionIdl, instructionInputs, instructionData);
      return instructionIdl;
    } catch {}
  }
  return undefined;
}

export function idlProgramGuessEvent(
  programIdl: IdlProgram,
  eventData: Uint8Array,
): IdlEvent | undefined {
  for (const eventIdl of programIdl.events.values()) {
    try {
      idlEventCheck(eventIdl, eventData);
      return eventIdl;
    } catch {}
  }
  return undefined;
}

export function idlProgramGuessError(
  programIdl: IdlProgram,
  errorCode: number,
): IdlError | undefined {
  for (const errorIdl of programIdl.errors.values()) {
    if (errorIdl.code === errorCode) {
      return errorIdl;
    }
  }
  return undefined;
}

export function idlProgramParse(programValue: JsonValue): IdlProgram {
  const programObject = jsonExpectObject(programValue);
  const metadata = {
    ...idlMetadataDecode(programObject),
    ...idlMetadataDecode(programObject["metadata"]),
  };
  const typedefs = parseScopedNamedValues(
    programObject,
    "types",
    false,
    undefined,
    idlTypedefParse,
  );
  const accounts = parseScopedNamedValues(
    programObject,
    "accounts",
    false,
    typedefs,
    idlAccountParse,
  );
  const instructions = parseScopedNamedValues(
    programObject,
    "instructions",
    true,
    typedefs,
    idlInstructionParse,
  );
  const events = parseScopedNamedValues(
    programObject,
    "events",
    false,
    typedefs,
    idlEventParse,
  );
  /*
  const errors = parseScopedNamedValues(
    programObject,
    "errors",
    false,
    typedefs,
    idlErrorParse,
  );
  */
  const errors = errorsDecode(programObject["errors"]);
  return { metadata, typedefs, accounts, instructions, events, errors };
}

const errorsDecode = scopedNamedValuesDecoder(idlErrorDecode, false);

function scopedNamedValuesDecoder<Content>(
  contentDecode: Decode<Content>,
  convertNameToSnakeCase: boolean,
): Decode<Map<string, Content & { name: string }>> {
  return jsonDecoderMap(
    jsonDecoderByKind({
      undefined: () => new Map(),
      object: jsonDecoderObjectToMap(contentDecode),
      array: jsonDecoderMap(
        jsonDecoderArray(
          jsonDecoderMerged(
            jsonDecoderObject({ name: jsonDecodeString }),
            contentDecode,
            (part1, part2) => ({ name: part1.name, content: part2 }),
          ),
        ),
        (items) => {
          const map = new Map<string, Content>();
          for (const item of items) {
            map.set(item.name, item.content);
          }
          return map;
        },
      ),
    }),
    (collection) => {
      const converted = new Map<string, Content & { name: string }>();
      for (const [key, value] of collection) {
        let name = key;
        if (convertNameToSnakeCase) {
          name = camelCaseToSnakeCase(key);
        }
        converted.set(name, {
          name: key,
          ...value,
        });
      }
      return converted;
    },
  );
}

function parseScopedNamedValues<T, P>(
  programObject: JsonObject,
  collectionKey: string,
  convertNameToSnakeCase: boolean,
  param: P,
  parsingFunction: (name: string, value: JsonValue, param: P) => T,
): Map<string, T> {
  const values = new Map<string, T>();
  const collectionValue = programObject[collectionKey];
  const collectionArray = jsonAsArray(collectionValue);
  if (collectionArray !== undefined) {
    for (const itemValue of collectionArray) {
      const itemObject = jsonExpectObject(itemValue);
      let itemName = jsonExpectString(itemObject["name"]);
      if (convertNameToSnakeCase) {
        itemName = camelCaseToSnakeCase(itemName);
      }
      values.set(itemName, parsingFunction(itemName, itemValue, param));
    }
  }
  const collectionObject = jsonAsObject(collectionValue);
  if (collectionObject !== undefined) {
    Object.entries(collectionObject).forEach(([key, value]) => {
      if (convertNameToSnakeCase) {
        key = camelCaseToSnakeCase(key);
      }
      values.set(key, parsingFunction(key, value, param));
    });
  }
  return values;
}
