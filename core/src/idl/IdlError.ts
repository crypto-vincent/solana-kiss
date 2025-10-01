import {
  jsonAsNumber,
  jsonAsObject,
  jsonAsString,
  jsonExpectNumber,
  JsonValue,
} from "../data/Json";
import { Immutable } from "../utils";

export type IdlError = {
  name: string;
  docs: any;
  code: number;
  msg: string;
};

export const idlErrorUnknown: Immutable<IdlError> = {
  name: "Unknown",
  docs: undefined,
  code: 0,
  msg: "",
};

export function idlErrorParse(
  errorName: string,
  errorValue: JsonValue,
): IdlError {
  const errorNumber = jsonAsNumber(errorValue);
  if (errorNumber !== undefined) {
    return {
      name: errorName,
      docs: undefined,
      code: errorNumber,
      msg: "",
    };
  }
  const errorObject = jsonAsObject(errorValue);
  if (errorObject !== undefined) {
    return {
      name: errorName,
      docs: errorObject["docs"],
      code: jsonExpectNumber(errorObject["code"]),
      msg: jsonAsString(errorObject["msg"]) ?? "",
    };
  }
  throw new Error("Unparsable error (expected an object or number)");
}
