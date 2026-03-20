import { BlockSlot } from "./Block";
import { InstructionRequest } from "./Instruction";
import { JsonObject } from "./Json";

/**
 * On-chain execution metadata returned after a transaction is confirmed.
 * Includes timing, logs, any error, and resource-consumption figures.
 */
export type ExecutionReport = {
  /** The wall-clock time at which the containing block was produced, or `undefined` if not available. */
  blockTime: Date | undefined;
  /** The slot number of the block that confirmed this transaction. */
  blockSlot: BlockSlot;
  /** The ordered list of program log messages emitted during execution, or `undefined` if not available. */
  transactionLogs: Array<string> | undefined;
  /**
   * The transaction-level error, if any.
   * `null` means the transaction succeeded; a string or object describes the failure.
   */
  transactionError: null | string | JsonObject;
  /** The number of compute units consumed by the transaction. */
  consumedComputeUnits: number;
  /** The total transaction fee charged in lamports, or `undefined` if not reported. */
  chargedFeesLamports: bigint | undefined;
};

/**
 * The structured trace of a transaction's execution as an ordered sequence of
 * program invocations, raw data payloads, log messages, and unrecognized
 * entries.
 *
 * Each element is a tagged union:
 * - `{ invocation }` – a nested program invocation (CPI or top-level call)
 * - `{ data }` – raw bytes emitted via `Program data:` log prefix
 * - `{ log }` – a plain `Program log:` message string
 * - `{ unknown }` – an unparsed log line that does not match any known prefix
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
  /** The original instruction that triggered this invocation. */
  instructionRequest: InstructionRequest;
  /** Nested execution flow representing inner CPI calls and log lines emitted by this invocation. */
  innerExecutionFlow: ExecutionFlow;
  /** The error message if this invocation failed, or `undefined` if it succeeded. */
  instructionError: string | undefined;
  /** Raw return data emitted by this invocation via `Program return:`, or `undefined` if none. */
  instructionReturned: Uint8Array | undefined;
  /** The number of compute units consumed by this invocation, or `undefined` if not reported. */
  consumedComputeUnits: number | undefined;
};
