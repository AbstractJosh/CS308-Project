// Throw these from services and middleware. The error handler turns them into
// { error, details? } with the right status code.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message = 'Invalid input', details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Please log in first') => new HttpError(401, message);
export const forbidden = (message = 'You do not have permission to do this') => new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message = 'Conflict', details) => new HttpError(409, message, details);
