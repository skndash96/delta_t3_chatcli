import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  userId: number;
}

export const getToken = (payload: JWTPayload) => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export const verifyToken = async (token: string) => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  try {
    const { payload } = await jwtVerify<JWTPayload>(token, secret);
    return payload.userId;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
