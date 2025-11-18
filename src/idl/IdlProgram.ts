import { casingLosslessConvertToSnake } from "../data/Casing";
import { ErrorStack, withErrorContext } from "../data/Error";
import { InstructionRequest } from "../data/Instruction";
import {
  JsonObject,
  JsonValue,
  jsonCodecObjectValues,
  jsonCodecString,
  jsonCodecValue,
  jsonDecoderArray,
  jsonDecoderByType,
  jsonDecoderMultiplexed,
  jsonDecoderObjectKey,
  jsonDecoderObjectToMap,
  jsonDecoderWrapped,
} from "../data/Json";
import { IdlAccount, idlAccountCheck, idlAccountParse } from "./IdlAccount";
import { IdlConstant, idlConstantParse } from "./IdlConstant";
import { IdlError, idlErrorParse } from "./IdlError";
import { IdlEvent, idlEventCheck, idlEventParse } from "./IdlEvent";
import {
  IdlInstruction,
  idlInstructionAccountsCheck,
  idlInstructionArgsCheck,
  idlInstructionParse,
} from "./IdlInstruction";
import { IdlMetadata, idlMetadataParse } from "./IdlMetadata";
import { IdlTypedef, idlTypedefParse } from "./IdlTypedef";

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
  self: IdlProgram,
  accountData: Uint8Array,
): IdlAccount {
  const errors = [];
  for (const accountIdl of self.accounts.values()) {
    try {
      idlAccountCheck(accountIdl, accountData);
      return accountIdl;
    } catch (error) {
      errors.push(error);
    }
  }
  throw new ErrorStack("Idl: Failed to guess account", errors);
}

export function idlProgramGuessInstruction(
  self: IdlProgram,
  instructionRequest: InstructionRequest,
): IdlInstruction {
  const errors = [];
  for (const instructionIdl of self.instructions.values()) {
    try {
      idlInstructionAccountsCheck(
        instructionIdl,
        instructionRequest.instructionInputs,
      );
      idlInstructionArgsCheck(
        instructionIdl,
        instructionRequest.instructionData,
      );
      return instructionIdl;
    } catch (error) {
      errors.push(error);
    }
  }
  throw new ErrorStack("Idl: Failed to guess instruction", errors);
}

export function idlProgramGuessEvent(
  self: IdlProgram,
  eventData: Uint8Array,
): IdlEvent {
  const errors = [];
  for (const eventIdl of self.events.values()) {
    try {
      idlEventCheck(eventIdl, eventData);
      return eventIdl;
    } catch (error) {
      errors.push(error);
    }
  }
  throw new ErrorStack("Idl: Failed to guess event", errors);
}

export function idlProgramGuessError(
  self: IdlProgram,
  errorCode: number,
): IdlError {
  const codes = [];
  for (const errorIdl of self.errors.values()) {
    if (errorIdl.code === errorCode) {
      return errorIdl;
    }
    codes.push(errorIdl.code);
  }
  throw new ErrorStack("Idl: Failed to guess error", codes);
}

export function idlProgramParse(programValue: JsonValue): IdlProgram {
  const programObject = jsonCodecObjectValues.decoder(programValue);
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
      itemName = casingLosslessConvertToSnake(name);
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

const collectionJsonDecoder = jsonDecoderByType({
  undefined: () => new Map<string, JsonValue>(),
  object: jsonDecoderObjectToMap({
    keyDecoder: (name) => name,
    valueDecoder: (value) => value,
  }),
  array: jsonDecoderWrapped(
    jsonDecoderArray(
      jsonDecoderMultiplexed({
        key: jsonDecoderObjectKey("name", jsonCodecString.decoder),
        value: jsonCodecValue.decoder,
      }),
    ),
    (entries) => {
      return new Map<string, JsonValue>(
        entries.map(({ key, value }) => [key, value]),
      );
    },
  ),
});
