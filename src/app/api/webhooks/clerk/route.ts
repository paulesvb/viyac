import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import {
  type ClerkProfilePayload,
  syncClerkProfileToSupabase,
} from '@/lib/clerk-profile-sync';

export const runtime = 'nodejs';

type ClerkUserCreatedEvent = {
  type: 'user.created' | 'user.updated';
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
    external_accounts?: Array<{
      provider?: string | null;
    }> | null;
  };
};

function getDisplayName(data: ClerkUserCreatedEvent['data'], email: string): string {
  const fullName = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim();
  if (fullName) return fullName;
  if (data.username) return data.username;
  return email.split('@')[0] ?? data.id;
}

function toPayload(
  data: ClerkUserCreatedEvent['data'],
  email: string,
): ClerkProfilePayload {
  return {
    id: data.id,
    email,
    displayName: getDisplayName(data, email),
    externalAccounts: data.external_accounts,
  };
}

export async function POST(req: Request) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json(
      { error: 'Missing CLERK_WEBHOOK_SIGNING_SECRET.' },
      { status: 500 },
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

  if (event.type !== 'user.created' && event.type !== 'user.updated') {
    return NextResponse.json({ received: true, ignored: event.type }, { status: 200 });
  }

  const { email_addresses, primary_email_address_id } = event.data;

  const primaryEmail = email_addresses.find(
    (e) => e.id === primary_email_address_id,
  );
  const fallbackEmail = email_addresses[0];
  const email = primaryEmail?.email_address ?? fallbackEmail?.email_address;

  if (!email) {
    return NextResponse.json(
      { error: `No email available on ${event.type} event.` },
      { status: 400 },
    );
  }

  const { error } = await syncClerkProfileToSupabase(
    toPayload(event.data, email),
    event.type,
    { isDevProfile: false },
  );

  if (error) {
    return NextResponse.json(
      { error: `Supabase upsert failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
