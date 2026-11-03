   import jwt, { SignOptions } from 'jsonwebtoken';
   import { NextResponse } from 'next/server';
   export const sign = (data: object, expiresIn: SignOptions['expiresIn']) => jwt.sign(data, process.env.JWT_SECRET!, { expiresIn });
   export const verify = (t: string) => { try { return jwt.verify(t, process.env.JWT_SECRET!); } catch { return null; } };
   export const authed = (req: Request) => !!verify((req.headers.get('authorization') || '').replace('Bearer ', ''));
   export const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });