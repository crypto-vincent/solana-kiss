/**
 * Wraps a function call with error context, re-throwing as {@link ErrorStack}.
 * @param message - Context message.
 * @param fn - Function to execute.
 * @returns Return value of `fn`.
 * @throws {@link ErrorStack} wrapping the original error.
 */
export function withErrorContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new ErrorStack(message, error);
  }
}

/** Error that preserves a tree of nested inner errors. */
export class ErrorStack extends Error {
  /**
   * @param message - Top-level context message.
   * @param inner - Optional inner error(s) to nest.
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
