export function withErrorContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new ErrorStackable(message, error);
  }
}

export class ErrorStackable extends Error {
  constructor(message: string, inner?: any | Array<any>) {
    if (inner === undefined) {
      super(message);
      return;
    }
    const lines = new Array<string>();
    if (Array.isArray(inner)) {
      for (let index = 0; index < inner.length; index++) {
        errorStackLines(
          lines,
          inner[index],
          index < inner.length - 1 ? false : true,
        );
      }
    } else {
      errorStackLines(lines, inner, true);
    }
    super(`${message}\n` + lines.join("\n"));
  }
}

function errorStackLines(
  messageLines: Array<string>,
  error: any,
  isLast: boolean,
) {
  const errorLines = String(error).split("\n");
  for (let index = 0; index < errorLines.length; index++) {
    if (index === 0) {
      if (isLast) {
        messageLines.push(`└── ${errorLines[index]!}`);
      } else {
        messageLines.push(`├── ${errorLines[index]!}`);
      }
    } else {
      if (isLast) {
        messageLines.push(`    ${errorLines[index]!}`);
      } else {
        messageLines.push(`│   ${errorLines[index]!}`);
      }
    }
  }
}
