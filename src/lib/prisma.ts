import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaPg } from '@prisma/adapter-pg';

type PrismaAdapter = PrismaLibSql | PrismaPg;

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    adapter?: PrismaAdapter;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
}

function createAdapter(url: string): PrismaAdapter {
    if (/^postgres(ql)?:\/\//i.test(url)) {
        return new PrismaPg({ connectionString: url });
    }

    return new PrismaLibSql({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
}

const adapter =
    globalForPrisma.adapter ||
    createAdapter(databaseUrl);

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.adapter = adapter;
    globalForPrisma.prisma = prisma;
}
