import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Webhook } from 'svix';

export const runtime = 'nodejs';

type ClerkUserCreatedEvent = {
  type: 'user.created';
  data: {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    primary_email_address_id: string | null;
    email_addresses: Array<{
      id: string;
      email_address: string;
    }>;
  };
};

function getDisplayName(data: ClerkUserCreatedEvent['data'], email: string): string {
  const fullName = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
  if (fullName) return fullName;
  if (data.username) return data.username;
  return email.split('@')[0] ?? data.id;
}

export async function POST(req: Request) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing required env vars for Clerk webhook handling.' },
      { status: 500 }
    );
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing Svix signature headers.' }, { status: 400 });
  }

  const payload = await req.text();
  const webhook = new Webhook(signingSecret);

  let event: { type: string; data: ClerkUserCreatedEvent['data'] };
  try {
    event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: ClerkUserCreatedEvent['data'] };
  } catch {
    return NextResponse.json({ error: 'Invalid Svix signature.' }, { status: 400 });
  }

  if (event.type !== 'user.created') {
    return NextResponse.json({ received: true, ignored: event.type }, { status: 200 });
  }

  const primaryEmail = event.data.email_addresses.find(
    (email) => email.id === event.data.primary_email_address_id
  );
  const fallbackEmail = event.data.email_addresses[0];
  const email = primaryEmail?.email_address ?? fallbackEmail?.email_address;

  if (!email) {
    return NextResponse.json({ error: 'No email available on user.created event.' }, { status: 400 });
  }

  const displayName = getDisplayName(event.data, email);

  /** PostgREST only accepts schemas listed under Supabase → Settings → API → Exposed schemas (default: public, graphql_public). */
  const profilesSchema = process.env.SUPABASE_PROFILES_SCHEMA ?? 'public';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profilesTable =
    profilesSchema === 'public'
      ? supabase.from('profiles')
      : supabase.schema(profilesSchema).from('profiles');

  const { error } = await profilesTable.upsert(
    { id: event.data.id, email, display_name: displayName },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[clerk webhook] Supabase error:', error);
    return NextResponse.json({ error: `Supabase upsert failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
