/**
 * Centralized Error Handler
 */
export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message);

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Duplicate entry',
      field: err.meta?.target?.join(', ') || 'unknown',
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
}
