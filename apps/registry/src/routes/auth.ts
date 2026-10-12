import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import { DatabaseSync } from '../db/sqlite.js';
import { hashPassword } from '../db/migrate.js';

export interface UserPublicProfile {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'issuer' | 'creator' | 'auditor';
  organization?: string;
  creatorPub?: string;
  createdAt: string;
}

export function createAuthRouter(db: DatabaseSync): express.Router {
  const router = express.Router();

  // GET /api/auth/demo-users — 1-click demo personas
  router.get('/demo-users', (_req: Request, res: Response) => {
    try {
      const users = db.prepare(`
        SELECT id, username, email, name, role, organization, creator_pub as creatorPub, created_at as createdAt
        FROM users
        ORDER BY id ASC
      `).all() as UserPublicProfile[];

      return res.json({
        ok: true,
        users,
      });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err.message } });
    }
  });

  // POST /api/auth/login
  router.post('/login', (req: Request, res: Response) => {
    try {
      const { identifier, username, email, password } = req.body || {};
      const loginId = (identifier || username || email || '').trim().toLowerCase();

      if (!loginId) {
        return res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'Username or email is required' },
        });
      }

      // If demo mode or password not provided, check if user exists
      const user = db.prepare(`
        SELECT id, username, email, name, password_hash, role, organization, creator_pub as creatorPub, created_at as createdAt
        FROM users
        WHERE LOWER(username) = ? OR LOWER(email) = ?
      `).get(loginId, loginId) as any;

      if (!user) {
        return res.status(404).json({
          error: { code: 'USER_NOT_FOUND', message: 'No registered user matches this username or email' },
        });
      }

      if (password) {
        const computedHash = hashPassword(password);
        if (user.password_hash !== computedHash) {
          return res.status(401).json({
            error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect password' },
          });
        }
      }

      // Simple, robust session/token for dev/demo
      const token = `tok_${user.id}_${crypto.randomBytes(16).toString('hex')}`;

      const { password_hash, ...publicUser } = user;

      return res.json({
        ok: true,
        user: publicUser,
        token,
      });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err.message } });
    }
  });

  // POST /api/auth/register
  router.post('/register', (req: Request, res: Response) => {
    try {
      const {
        username,
        email,
        name,
        password,
        role = 'issuer',
        organization = '',
        creatorPub = '',
      } = req.body || {};

      if (!username || !email || !name) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Name, username, and email are required' },
        });
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      // Check existing username or email
      const existing = db.prepare(`
        SELECT id, username, email FROM users
        WHERE LOWER(username) = ? OR LOWER(email) = ?
      `).get(cleanUsername, cleanEmail) as any;

      if (existing) {
        const field = existing.username.toLowerCase() === cleanUsername ? 'Username' : 'Email';
        return res.status(409).json({
          error: { code: 'USER_EXISTS', message: `${field} is already registered` },
        });
      }

      const userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
      const pwdHash = hashPassword(password || 'password123');
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, username, email, name, password_hash, role, organization, creator_pub, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        cleanUsername,
        cleanEmail,
        name.trim(),
        pwdHash,
        ['issuer', 'creator', 'auditor'].includes(role) ? role : 'issuer',
        organization ? organization.trim() : null,
        creatorPub ? creatorPub.trim() : null,
        now
      );

      const user: UserPublicProfile = {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        name: name.trim(),
        role: role as any,
        organization: organization ? organization.trim() : undefined,
        creatorPub: creatorPub || undefined,
        createdAt: now,
      };

      const token = `tok_${userId}_${crypto.randomBytes(16).toString('hex')}`;

      return res.status(201).json({
        ok: true,
        user,
        token,
      });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err.message } });
    }
  });

  // GET /api/auth/me
  router.get('/me', (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const userIdHeader = req.headers['x-user-id'] as string;

      let userId = userIdHeader;
      if (!userId && authHeader?.startsWith('Bearer tok_')) {
        const parts = authHeader.slice(7).split('_');
        if (parts.length >= 2) {
          userId = parts[1];
        }
      }

      if (!userId) {
        // Return first default user in demo mode
        const first = db.prepare(`
          SELECT id, username, email, name, role, organization, creator_pub as creatorPub, created_at as createdAt
          FROM users ORDER BY id ASC LIMIT 1
        `).get() as any;
        return res.json({ ok: true, user: first || null });
      }

      const user = db.prepare(`
        SELECT id, username, email, name, role, organization, creator_pub as creatorPub, created_at as createdAt
        FROM users WHERE id = ?
      `).get(userId) as any;

      if (!user) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      }

      return res.json({ ok: true, user });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err.message } });
    }
  });

  return router;
}
