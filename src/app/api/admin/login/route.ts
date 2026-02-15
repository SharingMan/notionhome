import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createAdminSessionValue } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const token = String(formData.get('token') || '').trim();
    const adminToken = process.env.ADMIN_TOKEN?.trim();

    if (!adminToken || token !== adminToken) {
        return NextResponse.redirect(new URL('/admin?error=invalid', req.url), { status: 303 });
    }

    const response = NextResponse.redirect(new URL('/admin', req.url), { status: 303 });
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: createAdminSessionValue(adminToken),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/admin',
        maxAge: 60 * 60 * 24 * 30,
    });
    return response;
}
