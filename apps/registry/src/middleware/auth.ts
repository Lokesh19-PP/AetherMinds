import { Request, Response, NextFunction } from 'express';

const DEFAULT_DEV_TOKEN = '9c37d85f0ee31376a605ee4f6d831bb037fa1d3a9d727171';

export function requireIssuerAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.REGISTRY_API_TOKEN || DEFAULT_DEV_TOKEN;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing or invalid Bearer token for issuer access',
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (token !== expectedToken) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid issuer access token',
    });
    return;
  }

  next();
}
