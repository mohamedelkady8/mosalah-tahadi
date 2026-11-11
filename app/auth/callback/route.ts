import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/identifier';
import { createClient } from '@/lib/supabase/server';

/** Email confirmation links land here with a one-time code that becomes a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next')) ?? '/wheel';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
