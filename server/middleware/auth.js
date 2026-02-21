import { prisma } from '../prisma/client.js';

/**
 * Auth Middleware
 *
 * Role Assignment (mirrors AuthService.js + AuthContext.jsx):
 *   1. satyam.gupta@apnamart.in / satyam → SUPER_ADMIN (hardcoded, never overridden)
 *   2. Email in CheckerList table FOR THE CURRENT ENV → CHECKER
 *   3. Everyone else → MAKER
 *
 * Environment: read from X-Optimus-Env header (UAT | PROD), defaults to PROD.
 * The client-sent X-Optimus-Role header is IGNORED — role is resolved
 * server-side from the email + CheckerList table + environment.
 *
 * Wiki Reference: wiki/Feature-Maker-Checker.md — §2 Role Assignment
 */

const SUPER_ADMIN_IDENTIFIERS = ['satyam.gupta@apnamart.in', 'satyam'];

export async function authMiddleware(req, res, next) {
  // Health check doesn't need auth
  if (req.path === '/health') return next();

  const email = req.headers['x-optimus-user'];

  if (!email) {
    return res.status(401).json({ error: 'Missing X-Optimus-User header' });
  }

  // Resolve environment (UAT or PROD)
  const env = (req.headers['x-optimus-env'] || 'PROD').toUpperCase();
  req.env = env;

  try {
    const lowerEmail = email.toLowerCase();

    // Step 1: Resolve role server-side
    let role;

    if (SUPER_ADMIN_IDENTIFIERS.includes(lowerEmail)) {
      // Hardcoded SUPER_ADMIN — never overridden
      role = 'SUPER_ADMIN';
    } else {
      // Check if user is in the checker list for THIS environment
      const existingUser = await prisma.user.findUnique({
        where: { email: lowerEmail },
      });

      if (existingUser) {
        const checkerEntry = await prisma.checkerList.findUnique({
          where: { userId_env: { userId: existingUser.id, env } },
        });
        role = checkerEntry ? 'CHECKER' : 'MAKER';
      } else {
        role = 'MAKER';
      }
    }

    // Step 2: Upsert user with resolved role
    const user = await prisma.user.upsert({
      where: { email: lowerEmail },
      update: { role },
      create: { email: lowerEmail, name: email.split('@')[0], role },
    });

    req.user = user;
    next();
  } catch (err) {
    console.error('[auth] User upsert failed:', err.message);
    res.status(500).json({ error: 'Auth failed' });
  }
}
