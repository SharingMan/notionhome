import { NextRequest } from 'next/server';
import { NOTION_USER_SESSION_COOKIE, parseNotionUserSessionValue } from '@/lib/notion-user-session';

export function getNotionUserSessionFromRequest(req: NextRequest) {
    return parseNotionUserSessionValue(req.cookies.get(NOTION_USER_SESSION_COOKIE)?.value);
}

