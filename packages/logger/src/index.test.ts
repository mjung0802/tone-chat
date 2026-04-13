import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('createLogger', () => {
  it('returns a logger with the correct service binding', async () => {
    const { createLogger } = await import('./index.js');
    const logger = createLogger('testService');
    assert.strictEqual(logger.bindings()['service'], 'testService');
  });

  it('has a valid log level set', async () => {
    const { createLogger } = await import('./index.js');
    const logger = createLogger('testService');
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    assert.ok(validLevels.includes(logger.level), `unexpected level: ${logger.level}`);
  });

  it('child loggers inherit service binding and add module field', async () => {
    const { createLogger } = await import('./index.js');
    const logger = createLogger('testService');
    const child = logger.child({ module: 'auth.service' });
    assert.strictEqual(child.bindings()['service'], 'testService');
    assert.strictEqual(child.bindings()['module'], 'auth.service');
  });
});

describe('httpLogger', () => {
  it('returns a function (valid Express middleware shape)', async () => {
    const { createLogger, httpLogger } = await import('./index.js');
    const logger = createLogger('testService');
    const middleware = httpLogger(logger);
    assert.strictEqual(typeof middleware, 'function');
    assert.strictEqual(middleware.length, 3); // (req, res, next)
  });
});
