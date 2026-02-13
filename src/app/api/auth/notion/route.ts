import { NextResponse } from 'next/server';

const authorizeURL = `https://api.notion.com/v1/oauth/authorize?owner=user&client_id=${process.env.NOTION_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NOTION_REDIRECT_URI!)}&response_type=code`;

export async function GET() {
  if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_REDIRECT_URI) {
    return NextResponse.json({ error: 'Missing Notion Client credentials' }, { status: 500 });
  }
  return NextResponse.redirect(authorizeURL);
}
