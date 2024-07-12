import * as jose from 'jose';

const alg = 'HS256';

export async function generateToken(usagePointIds: string[], secret: string) {
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`${364 + 365 + 365}d`)
    .setSubject(usagePointIds as any)
    .sign(new TextEncoder().encode(secret));
}

export async function isTokenValid(token: string, usagePointId: string, secret: string): Promise<boolean> {
  try {
    const { payload: decoded } = await jose.jwtVerify(token, new TextEncoder().encode(secret));
    return Array.isArray(decoded.sub) && decoded.sub.includes(usagePointId);
  } catch (err) {
    return false;
  }
}
