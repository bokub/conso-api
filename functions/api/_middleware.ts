import { Logtail } from '@logtail/edge';
import type { Env } from '../../lib/env';
import type { RequestLogger } from '../../lib/logging';

let baseLogger: Logtail | undefined;

export interface RequestData extends Record<string, unknown> {
  logger: RequestLogger;
}

const consoleLogger: RequestLogger = {
  debug: (message, context) => console.debug({ message, ...context }),
  info: (message, context) => console.info({ message, ...context }),
  warn: (message, context) => console.warn({ message, ...context }),
  error: (message, context) => console.error({ message, ...context }),
  flush: async () => {},
};

function addRequestContext(logger: RequestLogger, request: Request): RequestLogger {
  const context = { method: request.method, url: request.url };
  const withContext =
    (level: 'debug' | 'info' | 'warn' | 'error') => (message: string | Error, fields?: Record<string, unknown>) =>
      logger[level](message, { ...fields, ...context });

  return {
    debug: withContext('debug'),
    info: withContext('info'),
    warn: withContext('warn'),
    error: withContext('error'),
    flush: () => logger.flush(),
  };
}

function getLogger(env: Env): Logtail | undefined {
  if (!env.SOURCE_TOKEN) {
    return undefined;
  }

  return (baseLogger ??= new Logtail(env.SOURCE_TOKEN, {
    endpoint: `https://${env.INGESTING_HOST}`,
    sendLogsToConsoleOutput: true,
  }));
}

export const onRequest: PagesFunction<Env, string, RequestData> = async (context) => {
  const requestLogger = addRequestContext(
    getLogger(context.env)?.withExecutionContext(context) ?? consoleLogger,
    context.request
  );
  context.data.logger = requestLogger;

  try {
    return await context.next();
  } finally {
    try {
      await requestLogger.flush();
    } catch (error) {
      console.error('log flush failed', error);
    }
  }
};
