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
        errorStackLines(lines, `Cause ${index + 1}`, inner[index]);
        if (index + 1 < inner.length) {
          lines.push("");
        }
      }
    } else {
      errorStackLines(lines, "Cause", inner);
    }
    super(`${message}\n\n` + lines.join("\n"));
  }
}

function errorStackLines(lines: Array<string>, title: string, error: any) {
  lines.push(`+-- ${title}:`);
  for (const line of String(error).split("\n")) {
    lines.push(`| ${line}`);
  }
  lines.push("+---");
}
