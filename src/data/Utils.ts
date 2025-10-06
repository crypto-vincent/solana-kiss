export function withContext<T>(message: string, fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    throw new Error(
      `${message}\n > ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
