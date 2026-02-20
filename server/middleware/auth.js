import { prisma } from '../prisma/client.js';

/**
 * Auth Middleware
 *
 * Role Assignment (mirrors AuthService.js + AuthContext.jsx):
 *   1. satyam.gupta@apnamart.in → SUPER_ADMIN (hardcoded, never overridden)
 *   2. Email in CheckerList table → CHECKER
 *   3. Everyone else → MAKER
 *
 * The client-sent X-Optimus-Role header is IGNORED — role is resolved
 * server-side from the email + CheckerList table.
 *
 * Wiki Reference: wiki/Feature-Maker-Checker.md — §2 Role Assignment
 */

const SUPER_ADMIN_EMAIL = 'satyam.gupta@apnamart.in';

export async function authMiddleware(req, res, next) {
  // Health check doesn't need auth
  if (req.path === '/health') return next();

  const email = req.headers['x-optimus-user'];

  if (!email) {
    return res.status(401).json({ error: 'Missing X-Optimus-User header' });
  }

  try {
    const lowerEmail = email.toLowerCase();

    // Step 1: Resolve role server-side
    let role;

    if (lowerEmail === SUPER_ADMIN_EMAIL) {
      // Hardcoded SUPER_ADMIN — never overridden
      role = 'SUPER_ADMIN';
    } else {
      // Check if user is in the checker list
      const existingUser = await prisma.user.findUnique({
        where: { email: lowerEmail },
        include: { checkerEntry: true },
      });

      if (existingUser?.checkerEntry) {
        role = 'CHECKER';
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
