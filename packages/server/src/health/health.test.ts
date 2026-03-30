import type { Request, Response, NextFunction } from 'express';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { healthRouter } = await import('./health.routes.js');

type TestResponse = Partial<Response> & { statusCode: number; _json: unknown };

function makeReq(): Request {
  return {} as Request;
}

function makeRes(): TestResponse {
  const res = { statusCode: 200, _json: undefined } as TestResponse;
  (res as { status: unknown }).status = (c: number) => { res.statusCode = c; return res; };
  (res as { json: unknown }).json = (d: unknown) => { res._json = d; return res; };
  return res;
}

describe('healthRouter GET /', () => {
  it('responds with ok:true and a version string', () => {
    // Get the route handler from the router's stack
    // Express 5 nests route handlers under layer.route.stack[0].handle
    const layer = healthRouter.stack[0];
    assert.ok(layer, 'No route registered');
    const routeLayer = layer?.route?.stack[0];
    assert.ok(routeLayer, 'No route layer');
    const handler = routeLayer?.handle;
    assert.ok(typeof handler === 'function', 'No handler');

    const req = makeReq();
    const res = makeRes();
    handler(req, res as Response, (() => {}) as NextFunction);

    assert.equal(res.statusCode, 200);
    const body = res._json as { ok: boolean; version: string };
    assert.equal(body.ok, true);
    assert.equal(body.version, '1.0.0');
  });
});
