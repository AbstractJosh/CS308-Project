import { badRequest } from '../utils/httpError.js';

// Usage in routes/index.js: router.post('/auth/login', validate(loginSchema), ...)
// or for query strings: validate(productListQuerySchema, 'query').
// On failure: 400 with error = the first message and details = [{ field, message }].
// On success: req.body gets the parsed body, or req.validatedQuery gets the parsed query.
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(badRequest(details[0]?.message || 'Invalid input', details));
    }
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    return next();
  };
}
