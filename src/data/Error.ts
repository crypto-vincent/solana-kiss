/**
 * Wraps a function call with error context, re-throwing any caught error as an {@link ErrorStack}.
 * @param message - A context message describing the operation being attempted.
 * @param fn - The function to execute.
 * @returns The return value of `fn`.
 * @throws {ErrorStack} If `fn` throws, wraps the original error with the provided message.
 */
export function withErrorContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new ErrorStack(message, error);
  }
}

/**
 * An error that preserves a tree of nested inner errors for debugging.
 * The message includes a visual tree of all inner error messages.
 */
export class ErrorStack extends Error {
  /**
   * @param message - The top-level context message.
   * @param inner - An optional inner error or array of inner errors to nest beneath this message.
   */
  constructor(message: string, inner?: any | Array<any>) {
    if (inner === undefined) {
      super(message);
      return;
    }
    const lines = new Array<string>();
    if (Array.isArray(inner)) {
      for (let index = 0; index < inner.length; index++) {
        errorStackLines(lines, inner[index], index === inner.length - 1);
      }
    } else {
      errorStackLines(lines, inner, true);
    }
    super(`${message}\n${lines.join("\n")}`);
  }
}

function errorStackLines(
  messageLines: Array<string>,
  innerError: any,
  isLastInner: boolean,
) {
  const innerLines = String(innerError).split("\n");
  for (let index = 0; index < innerLines.length; index++) {
    const innerLine = innerLines[index]!;
    if (index === 0) {
      if (!isLastInner) {
        messageLines.push(`├── ${innerLine}`);
      } else {
        messageLines.push(`└── ${innerLine}`);
      }
    } else {
      if (!isLastInner) {
        messageLines.push(`│   ${innerLine}`);
      } else {
        messageLines.push(`    ${innerLine}`);
      }
    }
  }
}
