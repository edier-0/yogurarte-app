import jwt, { Secret, SignOptions } from 'jsonwebtoken';

export interface AuthUserPayload {
  id: number;
  name: string;
  username: string;
  role: string;
}

const getJwtSecret = (): Secret => {
  return process.env.JWT_SECRET || 'ba6822f65365a699a960575fe416b3a00770fd1659c34654d56e8c955ce6a78a';
};

const getJwtExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || '1d';
};

/**
 * Genera un token JWT firmado criptográficamente
 */
export const generateToken = (payload: AuthUserPayload): string => {
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };

  return jwt.sign(payload, secret, options);
};

/**
 * Verifica y decodifica un token JWT
 */
export const verifyToken = (token: string): AuthUserPayload => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as AuthUserPayload;
};
