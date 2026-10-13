export interface RequestLogger {
  debug(message: string | Error, context?: Record<string, unknown>): void;
  info(message: string | Error, context?: Record<string, unknown>): void;
  warn(message: string | Error, context?: Record<string, unknown>): void;
  error(message: string | Error, context?: Record<string, unknown>): void;
  flush(): Promise<void>;
}
