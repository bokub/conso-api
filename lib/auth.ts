import jwt from 'jsonwebtoken';

const { JWT_SECRET } = process.env as { JWT_SECRET: string };

export function generateToken(usagePointIds: string[]) {
  return jwt.sign({ sub: usagePointIds, exp: Math.floor(Date.now() / 1000) + 3 * 364 * 24 * 3600 }, JWT_SECRET, {
    algorithm: 'HS256',
  });
}

export function isTokenValid(token: string, usagePointId: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return Array.isArray(decoded.sub) && decoded.sub.includes(usagePointId);
  } catch (err) {
    return false;
  }
}
