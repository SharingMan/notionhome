import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;
  const mode = req.nextUrl.searchParams.get('mode') === 'login' ? 'login' : 'connect';

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Missing Notion Client credentials' }, { status: 500 });
  }

  const authorizeURL = `https://api.notion.com/v1/oauth/authorize?owner=user&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${mode}`;
  return NextResponse.redirect(authorizeURL);
}
