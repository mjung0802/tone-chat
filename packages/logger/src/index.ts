import pino from 'pino';
import { pinoHttp } from 'pino-http';
import type { RequestHandler } from 'express';

export function createLogger(serviceName: string): pino.Logger {
  const isDev = process.env['NODE_ENV'] !== 'production';
  const usePretty = isDev && process.stdout.isTTY;
  const root = pino({
    level: isDev ? 'debug' : 'info',
    ...(usePretty && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    }),
  });
  return root.child({ service: serviceName });
}

export function httpLogger(logger: pino.Logger): RequestHandler {
  const isDev = process.env['NODE_ENV'] !== 'production';
  return pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
    customLogLevel: (_req, res, err) => {
      if (err != null || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return isDev ? 'info' : 'trace';
    },
    serializers: isDev
      ? {}
      : {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
  }) as RequestHandler;
}
