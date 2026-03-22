import { BlockSlot } from "./Block";
import { InstructionRequest } from "./Instruction";
import { JsonObject } from "./Json";

/** On-chain execution metadata after a transaction is confirmed. */
export type ExecutionReport = {
  /** Wall-clock time of the containing block, or `undefined`. */
  blockTime: Date | undefined;
  /** Slot of the block that confirmed this transaction. */
  blockSlot: BlockSlot;
  /** Ordered program log messages, or `undefined`. */
  transactionLogs: Array<string> | undefined;
  /**
   * Transaction-level error, if any.
   * `null` = success; string/object = failure.
   */
  transactionError: null | string | JsonObject;
  /** Compute units consumed by the transaction. */
  consumedComputeUnits: number;
  /** Total fee in lamports, or `undefined`. */
  chargedFeesLamports: bigint | undefined;
};

/**
 * Ordered trace of a transaction's execution: invocations, data, logs, and unknown entries.
 * - `{ invocation }` – nested program invocation (CPI or top-level call)
 * - `{ data }` – raw bytes from `Program data:` log
 * - `{ log }` – `Program log:` message
 * - `{ unknown }` – unparsed log line
 */
export type ExecutionFlow = Array<
  | { invocation: ExecutionInvocation }
  | { data: Uint8Array }
  | { log: string }
  | { unknown: string }
>;

/** A single program invocation within a {@link ExecutionFlow}. */
export type ExecutionInvocation = {
  /** Instruction that triggered this invocation. */
  instructionRequest: InstructionRequest;
  /** Nested CPI calls and log lines emitted by this invocation. */
  innerExecutionFlow: ExecutionFlow;
  /** Error message if this invocation failed, or `undefined`. */
  instructionError: string | undefined;
  /** Raw return data from `Program return:`, or `undefined`. */
  instructionReturned: Uint8Array | undefined;
  /** Compute units consumed, or `undefined`. */
  consumedComputeUnits: number | undefined;
};
