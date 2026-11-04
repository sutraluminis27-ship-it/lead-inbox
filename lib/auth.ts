import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
export const sign = (data: object, expiresIn: string) => jwt.sign(data, process.env.JWT_SECRET!, { expiresIn });
export const verify = (t: string) => { try { return jwt.verify(t, process.env.JWT_SECRET!); } catch { return null; } };
export const authed = (req: Request) => !!verify((req.headers.get('authorization') || '').replace('Bearer ', ''));
export const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
