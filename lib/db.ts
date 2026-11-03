import { PrismaClient } from '@prisma/client';
const g = globalThis as any;
export const prisma: PrismaClient = g.prisma || (g.prisma = new PrismaClient());
