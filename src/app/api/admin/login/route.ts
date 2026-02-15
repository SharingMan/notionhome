import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createAdminSessionValue } from '@/lib/admin-auth';
import { getPublicBaseUrl } from '@/lib/public-url';

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const token = String(formData.get('token') || '').trim();
    const adminToken = process.env.ADMIN_TOKEN?.trim();
    const baseUrl = getPublicBaseUrl(req);

    if (!adminToken || token !== adminToken) {
        return NextResponse.redirect(new URL('/admin?error=invalid', baseUrl), { status: 303 });
    }

    const response = NextResponse.redirect(new URL('/admin', baseUrl), { status: 303 });
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: createAdminSessionValue(adminToken),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
    });
    return response;
}
