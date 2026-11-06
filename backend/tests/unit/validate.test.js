import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { notFound } from '../../src/utils/httpError.js';

// A tiny app that uses the shared middleware the same way routes/index.js will.
function makeApp() {
  const app = express();
  app.use(express.json());
  const bodySchema = z.object({ email: z.string().email({ message: 'Enter a valid email' }) });
  const querySchema = z.object({ page: z.coerce.number().int().min(1).default(1) });
  app.post('/body', validate(bodySchema), (req, res) => res.json({ body: req.body }));
  app.get('/query', validate(querySchema, 'query'), (req, res) => res.json({ query: req.validatedQuery }));
  app.get('/missing', (req, res, next) => next(notFound('Product not found')));
  app.get('/crash', () => {
    throw new Error('database password is secret');
  });
  app.use(errorHandler);
  return app;
}

describe('validate middleware and error handler', () => {
  const app = makeApp();

  it('sends 400 with error and details when the body is invalid', async () => {
    const res = await request(app).post('/body').send({ email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Enter a valid email',
      details: [{ field: 'email', message: 'Enter a valid email' }],
    });
  });

  it('puts the parsed query in req.validatedQuery', async () => {
    const res = await request(app).get('/query?page=3');
    expect(res.body).toEqual({ query: { page: 3 } });
  });

  it('sends the status and message of an HttpError', async () => {
    const res = await request(app).get('/missing');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const res = await request(app).get('/crash');
    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/password/);
  });
});
