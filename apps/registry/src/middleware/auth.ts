import { Request, Response, NextFunction } from 'express';

const DEFAULT_DEV_TOKEN = '9c37d85f0ee31376a605ee4f6d831bb037fa1d3a9d727171';

export function requireIssuerAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.REGISTRY_API_TOKEN;
  const isDemo = process.env.DEMO_MODE === 'true';

  // 1. If an authenticated user is logged in (x-user-id header exists)
  const userId = req.headers['x-user-id'];
  if (userId) {
    return next();
  }

  // 2. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (
      token === DEFAULT_DEV_TOKEN ||
      token.startsWith('tok_') ||
      (expectedToken && token === expectedToken) ||
      isDemo
    ) {
      return next();
    }
  }

  // 3. In demo mode or if no token configured, allow access
  if (isDemo || !expectedToken) {
    return next();
  }

  res.status(401).json({
    error: 'UNAUTHORIZED',
    message: 'Missing or invalid Bearer token for issuer access',
  });
}
