import { SignJWT, jwtVerify } from "jose";
export const getToken = (payload) => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);
};
export const verifyToken = async (token) => {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload.userId;
    }
    catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
};
