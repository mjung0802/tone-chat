import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, NextFunction } from 'express';
import { z } from 'zod';

const { validateBody } = await import('./validate.js');

// Helpers
function makeReq(body: unknown): Request {
  return { body } as Request;
}

function makeRes() {
  const res = {
    _statusCode: 200,
    _json: null as unknown,
    status(code: number) { res._statusCode = code; return { json: (d: unknown) => { res._json = d; } }; },
  };
  return res;
}

describe('validateBody', () => {
  const schema = z.object({ name: z.string().min(1).max(50) });

  it('calls next() when body is valid', () => {
    let nextCalled = false;
    const middleware = validateBody(schema);
    const req = makeReq({ name: 'hello' });
    const res = makeRes();
    // @ts-expect-error — partial response mock; validateBody only uses .status().json()
    middleware(req, res, (() => { nextCalled = true; }) as NextFunction);
    assert.ok(nextCalled);
  });

  it('strips unknown fields from req.body', () => {
    let nextCalled = false;
    const middleware = validateBody(schema);
    const req = makeReq({ name: 'hello', extra: 'garbage' });
    const res = makeRes();
    // @ts-expect-error — partial response mock; validateBody only uses .status().json()
    middleware(req, res, (() => { nextCalled = true; }) as NextFunction);
    assert.ok(nextCalled);
    assert.deepEqual(req.body, { name: 'hello' });
    assert.ok(!('extra' in (req.body as object)));
  });

  it('returns 400 VALIDATION_ERROR when required field is missing', () => {
    let nextCalled = false;
    const middleware = validateBody(schema);
    const req = makeReq({});
    const res = makeRes();
    // @ts-expect-error — partial response mock; validateBody only uses .status().json()
    middleware(req, res, (() => { nextCalled = true; }) as NextFunction);
    assert.ok(!nextCalled);
    assert.equal(res._statusCode, 400);
    const body = res._json as { error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('returns 400 VALIDATION_ERROR when field has wrong type', () => {
    const middleware = validateBody(schema);
    const req = makeReq({ name: 42 });
    const res = makeRes();
    // @ts-expect-error — partial response mock; validateBody only uses .status().json()
    middleware(req, res, (() => {}) as NextFunction);
    assert.equal(res._statusCode, 400);
    const body = res._json as { error: { code: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
  });

  it('returns 400 when refine constraint fails', () => {
    const refinedSchema = z.object({
      content: z.string().optional(),
      attachmentIds: z.array(z.string()).optional(),
    }).refine((d) => d.content !== undefined || (d.attachmentIds !== undefined && d.attachmentIds.length > 0), {
      message: 'content or attachmentIds required',
    });
    const middleware = validateBody(refinedSchema);
    const req = makeReq({});
    const res = makeRes();
    // @ts-expect-error — partial response mock; validateBody only uses .status().json()
    middleware(req, res, (() => {}) as NextFunction);
    assert.equal(res._statusCode, 400);
    const body = res._json as { error: { code: string; message: string } };
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.message, 'content or attachmentIds required');
  });
});
