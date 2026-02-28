import { BlockSlot } from "./Block";
import { InstructionRequest } from "./Instruction";
import { JsonObject } from "./Json";

/**
 * On-chain execution metadata returned after a transaction is confirmed.
 * Includes timing, logs, any error, and resource-consumption figures.
 */
export type ExecutionReport = {
  blockTime: Date | undefined;
  blockSlot: BlockSlot;
  transactionLogs: Array<string> | undefined;
  transactionError: null | string | JsonObject;
  consumedComputeUnits: number;
  chargedFeesLamports: bigint | undefined;
};

/**
 * The structured trace of a transaction's execution as an ordered sequence of
 * program invocations, raw data payloads, log messages, and unrecognized
 * entries.
 */
export type ExecutionFlow = Array<
  | { invocation: ExecutionInvocation }
  | { data: Uint8Array }
  | { log: string }
  | { unknown: string }
>;

/**
 * A single program invocation captured within a {@link ExecutionFlow},
 * including the original instruction, nested inner calls, any error raised,
 * the raw return data, and the number of compute units consumed.
 */
export type ExecutionInvocation = {
  instructionRequest: InstructionRequest;
  innerExecutionFlow: ExecutionFlow;
  instructionError: string | undefined;
  instructionReturned: Uint8Array | undefined;
  consumedComputeUnits: number | undefined;
};
