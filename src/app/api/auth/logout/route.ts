import { NextRequest, NextResponse } from 'next/server';
import { NOTION_USER_SESSION_COOKIE } from '@/lib/notion-user-session';
import { getPublicBaseUrl } from '@/lib/public-url';

export async function POST(req: NextRequest) {
    const response = NextResponse.redirect(new URL('/my', getPublicBaseUrl(req)), { status: 303 });
    response.cookies.set({
        name: NOTION_USER_SESSION_COOKIE,
        value: '',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
    return response;
}

