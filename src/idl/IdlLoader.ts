import { inflate } from "uzip";
import {
  jsonCodecBytesArray,
  jsonCodecObjectSnakeToObjectCamel,
  jsonCodecPubkey,
  JsonValue,
} from "../data/Json";
import {
  Pubkey,
  pubkeyCreateFromSeed,
  pubkeyFindPdaAddress,
} from "../data/Pubkey";
import { utf8Decode } from "../data/Utf8";
import { idlAccountDecode, idlAccountParse } from "./IdlAccount";
import { idlInstructionParse } from "./IdlInstruction";
import { IdlProgram, idlProgramParse } from "./IdlProgram";

export type IdlLoader = (programAddress: Pubkey) => Promise<IdlProgram>;

export function idlLoaderFallbackToUnknown(): IdlLoader {
  const instructionIdl = idlInstructionParse("unknown_instruction", {
    discriminator: [],
    accounts: [],
    args: [],
  });
  const accountIdl = idlAccountParse("UnknownAccount", {
    discriminator: [],
    fields: [],
  });
  const eventIdl = idlAccountParse("UnknownEvent", {
    discriminator: [],
    fields: [],
  });
  return async (programAddress: Pubkey) => {
    return {
      metadata: {
        name: undefined,
        description: undefined,
        repository: undefined,
        contact: undefined,
        address: programAddress,
        version: undefined,
        spec: undefined,
        docs: undefined,
      },
      typedefs: new Map(),
      accounts: new Map([[accountIdl.name, accountIdl]]),
      instructions: new Map([[instructionIdl.name, instructionIdl]]),
      events: new Map([[eventIdl.name, eventIdl]]),
      errors: new Map(),
      constants: new Map(),
    };
  };
}

export function idlLoaderFromUrl(
  urlBuilder: (programAddress: Pubkey) => string,
  options?: {
    cacheApprover?: (programAddress: Pubkey) => Promise<boolean>;
    customFetcher?: (url: string) => Promise<JsonValue>;
  },
): IdlLoader {
  const cacheIdls = new Map<Pubkey, IdlProgram>();
  const cacheApprover = options?.cacheApprover ?? (async () => true);
  const jsonFetcher =
    options?.customFetcher ??
    (async (url) => {
      const response = await fetch(url);
      return (await response.json()) as JsonValue;
    });
  return async (programAddress: Pubkey) => {
    if (await cacheApprover(programAddress)) {
      const cacheIdl = cacheIdls.get(programAddress);
      if (cacheIdl) {
        return cacheIdl;
      }
    }
    const httpJson = await jsonFetcher(urlBuilder(programAddress));
    const httpProgramIdl = idlProgramParse(httpJson as JsonValue);
    httpProgramIdl.metadata.address = programAddress;
    cacheIdls.set(programAddress, httpProgramIdl);
    return httpProgramIdl;
  };
}

export function idlLoaderFromOnchain(
  accountDataFetcher: (accountAddress: Pubkey) => Promise<Uint8Array>,
  options?: {
    cacheApprover?: (programAddress: Pubkey) => Promise<boolean>;
  },
): IdlLoader {
  const cacheIdls = new Map<Pubkey, IdlProgram>();
  const cacheApprover = options?.cacheApprover ?? (async () => true);
  return async (programAddress: Pubkey) => {
    if (await cacheApprover(programAddress)) {
      const cacheIdl = cacheIdls.get(programAddress);
      if (cacheIdl) {
        return cacheIdl;
      }
    }
    const onchainAnchorAddress = pubkeyCreateFromSeed(
      pubkeyFindPdaAddress(programAddress, []),
      "anchor:idl",
      programAddress,
    );
    const onchainAnchorData = await accountDataFetcher(onchainAnchorAddress);
    const onchainAnchorState = idlAccountDecode(
      onchainAnchorAccountIdl,
      onchainAnchorData,
    );
    const onchainAnchorContent =
      onchainAnchorJsonCodec.decoder(onchainAnchorState);
    const onchainAnchorBytes = inflate(onchainAnchorContent.deflatedJson);
    const onchainAnchorString = utf8Decode(onchainAnchorBytes);
    const onchainAnchorJson = JSON.parse(onchainAnchorString) as JsonValue;
    const onchainAnchorIdl = idlProgramParse(onchainAnchorJson);
    onchainAnchorIdl.metadata.address = programAddress;
    onchainAnchorIdl.accounts.set(
      onchainAnchorAccountIdl.name,
      onchainAnchorAccountIdl,
    );
    cacheIdls.set(programAddress, onchainAnchorIdl);
    return onchainAnchorIdl;
  };
}

const onchainAnchorAccountIdl = idlAccountParse("anchor:idl", {
  discriminator: [24, 70, 98, 191, 58, 144, 123, 158],
  fields: [
    { name: "authority", type: "pubkey" },
    { name: "deflated_json", type: { vec32: "u8" } },
  ],
});

const onchainAnchorJsonCodec = jsonCodecObjectSnakeToObjectCamel({
  authority: jsonCodecPubkey,
  deflatedJson: jsonCodecBytesArray,
});
