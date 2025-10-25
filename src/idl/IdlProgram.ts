import { casingConvertToSnake } from "../data/Casing";
import { Instruction } from "../data/Instruction";
import {
  JsonObject,
  JsonValue,
  jsonCodecObjectRaw,
  jsonCodecRaw,
  jsonCodecString,
  jsonDecoderArray,
  jsonDecoderByKind,
  jsonDecoderForked,
  jsonDecoderObjectKey,
  jsonDecoderObjectToMap,
  jsonDecoderTransform,
} from "../data/Json";
import { withErrorContext } from "../data/Utils";
import { IdlAccount, idlAccountCheck, idlAccountParse } from "./IdlAccount";
import { IdlConstant, idlConstantParse } from "./IdlConstant";
import { IdlError, idlErrorParse } from "./IdlError";
import { IdlEvent, idlEventCheck, idlEventParse } from "./IdlEvent";
import {
  IdlInstruction,
  idlInstructionCheck,
  idlInstructionParse,
} from "./IdlInstruction";
import { IdlMetadata, idlMetadataParse } from "./IdlMetadata";
import { IdlTypedef, idlTypedefParse } from "./IdlTypedef";

// TODO (service) - provide a in-house SPL library of trusted programs ?
// TODO - provide a type inference type for IDL to typescript types ?
export type IdlProgram = {
  metadata: IdlMetadata;
  typedefs: Map<string, IdlTypedef>;
  accounts: Map<string, IdlAccount>;
  instructions: Map<string, IdlInstruction>;
  events: Map<string, IdlEvent>;
  errors: Map<string, IdlError>;
  constants: Map<string, IdlConstant>;
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
  instruction: Instruction,
): IdlInstruction | undefined {
  for (const instructionIdl of programIdl.instructions.values()) {
    try {
      idlInstructionCheck(instructionIdl, instruction.inputs, instruction.data);
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
  const programObject = jsonCodecObjectRaw.decoder(programValue);
  const metadata = idlMetadataParse(programObject);
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
  const errors = parseScopedNamedValues(
    programObject,
    "errors",
    false,
    undefined,
    idlErrorParse,
  );
  const constants = parseScopedNamedValues(
    programObject,
    "constants",
    false,
    undefined,
    idlConstantParse,
  );
  return {
    metadata,
    typedefs,
    accounts,
    instructions,
    events,
    errors,
    constants,
  };
}

function parseScopedNamedValues<Content, Param>(
  programObject: JsonObject,
  collectionName: string,
  convertNameToSnakeCase: boolean,
  param: Param,
  parsingFunction: (name: string, value: JsonValue, param: Param) => Content,
): Map<string, Content> {
  const values = new Map<string, Content>();
  for (const [name, value] of collectionJsonDecoder(
    programObject[collectionName],
  )) {
    let itemName = name;
    if (convertNameToSnakeCase) {
      itemName = casingConvertToSnake(name);
    }
    values.set(
      itemName,
      withErrorContext(`Idl: Parse: ${collectionName}: ${itemName}`, () =>
        parsingFunction(itemName, value, param),
      ),
    );
  }
  return values;
}

const collectionJsonDecoder = jsonDecoderByKind({
  undefined: () => new Map<string, JsonValue>(),
  object: jsonDecoderObjectToMap({
    keyDecoder: (name) => name,
    valueDecoder: jsonCodecRaw.decoder,
  }),
  array: jsonDecoderTransform(
    jsonDecoderArray(
      jsonDecoderForked([
        jsonDecoderObjectKey("name", jsonCodecString.decoder),
        jsonCodecRaw.decoder,
      ]),
    ),
    (entries) => {
      return new Map<string, JsonValue>(entries);
    },
  ),
});
