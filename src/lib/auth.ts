import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );
    return payload.username as string;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
} 