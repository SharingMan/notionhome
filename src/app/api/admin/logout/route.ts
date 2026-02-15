import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
    const response = NextResponse.redirect(new URL('/admin', req.url), { status: 303 });
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: '',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/admin',
    });
    return response;
}
