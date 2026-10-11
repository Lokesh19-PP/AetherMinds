import { Request, Response, NextFunction } from 'express';

export function requireIssuerAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.REGISTRY_API_TOKEN;

  if (!expectedToken) {
    // If not configured, reject for security
    res.status(500).json({
      error: 'CONFIG_ERROR',
      message: 'REGISTRY_API_TOKEN not configured on server',
    });
    return;
  }

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
