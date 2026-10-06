import type { RequestHandler } from 'express';

type Claims = { admin?: unknown };
export function requireAdministrator(verify: (token: string) => Promise<Claims>): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
    if (!match) { res.status(401).json({ error: 'Inicia sesión para utilizar esta función.' }); return; }
    try {
      const claims = await verify(match[1]);
      if (claims.admin !== true) { res.status(403).json({ error: 'Se requiere permiso de administración.' }); return; }
      next();
    } catch {
      res.status(401).json({ error: 'La sesión no es válida. Vuelve a iniciar sesión.' });
    }
  };
}

// Per-instance protection, not a substitute for infrastructure quotas or App Check.
export function createApiLimiter(limit = 20, windowMs = 60_000, capacity = 10_000): RequestHandler {
  const clients = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of clients) if (entry.until <= now) clients.delete(key);
    const key = req.ip || 'unknown';
    let entry = clients.get(key);
    if (!entry) {
      if (clients.size >= capacity) { res.status(429).json({ error: 'Servicio ocupado. Reintenta más tarde.' }); return; }
      entry = { count: 0, until: now + windowMs };
      clients.set(key, entry);
    }
    if (++entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.until - now) / 1000));
      res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto y vuelve a intentar.' });
      return;
    }
    next();
  };
}
