import { Instruction } from "./data/Instruction";
import { Pubkey } from "./data/Pubkey";
import { idlAccountDecode } from "./idl/IdlAccount";
import { idlInstructionDecode } from "./idl/IdlInstruction";
import {
  IdlLoader,
  idlLoaderFallbackToUnknown,
  idlLoaderFromOnchain,
  idlLoaderFromUrl,
} from "./idl/IdlLoader";
import {
  IdlProgram,
  idlProgramGuessAccount,
  idlProgramGuessInstruction,
} from "./idl/IdlProgram";
import { RpcHttp } from "./rpc/RpcHttp";
import { rpcHttpGetAccountWithData } from "./rpc/RpcHttpGetAccountWithData";

export class Service {
  private readonly rpcHttp: RpcHttp;
  private readonly idlLoaders: Array<IdlLoader>;
  private readonly idlOverrides: Map<Pubkey, IdlProgram>;

  constructor(
    rpcHttp: RpcHttp,
    options?: {
      idlLoaders?: Array<IdlLoader>;
      idlOverrides?: Map<Pubkey, IdlProgram>;
    },
  ) {
    this.rpcHttp = rpcHttp;
    this.idlLoaders = options?.idlLoaders ?? defaultLoaders(rpcHttp);
    this.idlOverrides = options?.idlOverrides ?? new Map();
  }

  public setProgramIdl(
    programAddress: Pubkey,
    programIdl: IdlProgram | undefined,
  ) {
    if (programIdl === undefined) {
      this.idlOverrides.delete(programAddress);
    } else {
      this.idlOverrides.set(programAddress, programIdl);
    }
  }

  public async getOrLoadProgramIdl(programAddress: Pubkey) {
    const overrideIdl = this.idlOverrides.get(programAddress);
    if (overrideIdl) {
      return overrideIdl;
    }
    for (const idlLoader of this.idlLoaders) {
      try {
        return await idlLoader(programAddress);
      } catch (error) {
        // TODO (error) - log error stack ?
      }
    }
    throw new Error(`IDL not found for program ${programAddress}`);
  }

  public async getAndInferAndDecodeAccountInfo(accountAddress: Pubkey) {
    const { accountInfo } = await rpcHttpGetAccountWithData(
      this.rpcHttp,
      accountAddress,
    );
    const programIdl = await this.getOrLoadProgramIdl(accountInfo.owner);
    const accountIdl = idlProgramGuessAccount(programIdl, accountInfo.data);
    if (!accountIdl) {
      throw new Error(
        `IDL Account not found for account ${accountAddress} of program ${accountInfo.owner}`,
      );
    }
    return {
      programInfo: {
        idl: programIdl,
      },
      accountInfo: {
        ...accountInfo,
        idl: accountIdl,
        state: idlAccountDecode(accountIdl, accountInfo.data),
      },
    };
  }

  public async inferAndDecodeInstruction(instruction: Instruction) {
    const programIdl = await this.getOrLoadProgramIdl(
      instruction.programAddress,
    );
    const instructionIdl = idlProgramGuessInstruction(programIdl, instruction);
    if (!instructionIdl) {
      throw new Error(
        `IDL Instruction not found for instruction of program ${instruction.programAddress}`,
      );
    }
    return idlInstructionDecode(instructionIdl, instruction);
  }
}

function defaultLoaders(rpcHttp: RpcHttp) {
  return [
    idlLoaderFromOnchain(async (programAddress) => {
      const { accountInfo } = await rpcHttpGetAccountWithData(
        rpcHttp,
        programAddress,
      );
      return accountInfo.data;
    }),
    idlLoaderFromUrl((programAddress) => {
      return `https://raw.githubusercontent.com/crypto-vincent/solana-idls/refs/heads/main/data/${programAddress}.json`;
    }),
    idlLoaderFallbackToUnknown(),
  ];
}
