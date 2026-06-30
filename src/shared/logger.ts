export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

type LogPayload = Record<string, unknown> | undefined;

const logPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

function readConfiguredLevel(): LogLevel {
  const envLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in logPriority) return envLevel as LogLevel;
  return import.meta.env.DEV ? "debug" : "warn";
}

function shouldLog(configuredLevel: LogLevel, level: LogLevel): boolean {
  return logPriority[level] >= logPriority[configuredLevel] && configuredLevel !== "silent";
}

function write(level: Exclude<LogLevel, "silent">, message: string, payload?: LogPayload): void {
  const configuredLevel = readConfiguredLevel();
  if (!shouldLog(configuredLevel, level)) return;

  const data = payload ? { scope: "airship", ...payload } : { scope: "airship" };
  const line = `[${level.toUpperCase()}] ${message}`;

  if (level === "error") {
    console.error(line, data);
    return;
  }

  if (level === "warn") {
    console.warn(line, data);
    return;
  }

  console.info(line, data);
}

export const logger = {
  debug(message: string, payload?: LogPayload): void {
    write("debug", message, payload);
  },
  info(message: string, payload?: LogPayload): void {
    write("info", message, payload);
  },
  warn(message: string, payload?: LogPayload): void {
    write("warn", message, payload);
  },
  error(message: string, payload?: LogPayload): void {
    write("error", message, payload);
  },
};
