import { resolveUser } from '../services/WidgetDataService.js';

/**
 * Auth Middleware
 *
 * Role Assignment:
 *   1. satyam.gupta@apnamart.in / satyam → SUPER_ADMIN (hardcoded, zero DB calls)
 *   2. Email in user_roles table FOR THE CURRENT ENV → CHECKER
 *   3. Everyone else → MAKER
 *
 * Environment: read from X-Optimus-Env header (UAT | PROD), defaults to PROD.
 * req.user = { email, name, role } — email-based, no UUID.
 */

export async function authMiddleware(req, res, next) {
  if (req.path === '/health') return next();

  const email = req.headers['x-optimus-user'];

  if (!email) {
    return res.status(401).json({ error: 'Missing X-Optimus-User header' });
  }

  const env = (req.headers['x-optimus-env'] || 'PROD').toUpperCase();
  req.env = env;

  try {
    req.user = await resolveUser(email, env);
    next();
  } catch (err) {
    console.error('[auth] User resolve failed:', err.message);
    res.status(500).json({ error: 'Auth failed' });
  }
}
