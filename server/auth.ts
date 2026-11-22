import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';
import type { AuthUser, RegionCode, StaffPermissionKey, StaffPermissions, UserRole } from '../src/types.ts';
import { OWNER_PERMISSIONS, hasPermission } from '../src/utils/commerce.ts';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

interface RawUserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  permissions_json: string;
  assigned_regions_json: string;
  active: number;
  created_at: string;
}

export function mapUserRow(row: RawUserRow): AuthUser {
  let permissions = OWNER_PERMISSIONS;
  try {
    permissions = JSON.parse(row.permissions_json) as StaffPermissions;
  } catch {
    // keep default
  }
  let assignedRegions: RegionCode[] = ['en', 'no', 'it', 'vn'];
  try {
    assignedRegions = JSON.parse(row.assigned_regions_json) as RegionCode[];
  } catch {
    // keep default
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    permissions: row.role === 'owner' ? OWNER_PERMISSIONS : permissions,
    assigned_regions: assignedRegions,
    active: Boolean(row.active),
    created_at: row.created_at,
  };
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    expiresAt
  );
  return token;
}

export function getUserByToken(token: string | undefined): AuthUser | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1`
    )
    .get(token) as RawUserRow | undefined;
  return row ? mapUserRow(row) : null;
}

export function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

export interface AuthedRequest extends Request {
  authUser?: AuthUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  const user = getUserByToken(token);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.authUser = user;
  next();
}

export function requireStaffOrOwner(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.authUser || (req.authUser.role !== 'owner' && req.authUser.role !== 'staff')) {
      res.status(403).json({ error: 'Owner or Staff access required' });
      return;
    }
    next();
  });
}

export function requirePermission(perm: StaffPermissionKey) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    requireStaffOrOwner(req, res, () => {
      if (!hasPermission(req.authUser, perm)) {
        res.status(403).json({ error: `Missing required permission: ${perm}` });
        return;
      }
      next();
    });
  };
}

export function logAudit(
  user: Pick<AuthUser, 'email' | 'role'>,
  action: string,
  target: string,
  details: string
): void {
  db.prepare(
    'INSERT INTO audit_logs (actor_email, actor_role, action, target, details) VALUES (?, ?, ?, ?, ?)'
  ).run(user.email, user.role, action, target, details);
}
