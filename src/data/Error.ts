/** Calls a function, prepending a context prefix to any error. */

export function withErrorContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new ErrorStack(message, error);
  }
}

export class ErrorStack extends Error {
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
