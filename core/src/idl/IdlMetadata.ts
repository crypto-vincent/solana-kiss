import { jsonDecoderString, jsonExpectObject, JsonValue } from "../data/Json";
import { Pubkey } from "../data/Pubkey";

export type IdlMetadata = {
  name?: string;
  docs?: any;
  description?: string;
  address?: Pubkey;
  version?: string;
  spec?: string;
};

export function idlMetadataParse(metadataValue: JsonValue): IdlMetadata {
  if (!metadataValue) {
    return {};
  }
  const metadataIdl: IdlMetadata = {};
  const metadataObject = jsonExpectObject(metadataValue);
  const metadataName = metadataObject["name"];
  if (metadataName !== undefined) {
    metadataIdl.name = jsonDecoderString(metadataName);
  }
  const metadataDocs = metadataObject["docs"];
  if (metadataDocs !== undefined) {
    metadataIdl.docs = metadataDocs;
  }
  const metadataDescription = metadataObject["description"];
  if (metadataDescription !== undefined) {
    metadataIdl.description = jsonDecoderString(metadataDescription);
  }
  const metadataAddress = metadataObject["address"];
  if (metadataAddress !== undefined) {
    metadataIdl.address = jsonDecoderString(metadataAddress);
  }
  const metadataVersion = metadataObject["version"];
  if (metadataVersion !== undefined) {
    metadataIdl.version = jsonDecoderString(metadataVersion);
  }
  const metadataSpec = metadataObject["spec"];
  if (metadataSpec !== undefined) {
    metadataIdl.spec = jsonDecoderString(metadataSpec);
  }
  return metadataIdl;
}
