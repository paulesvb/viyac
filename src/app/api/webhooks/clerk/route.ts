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

/** Clerk webhooks may use snake_case or camelCase; test payloads sometimes omit emails. */
function extractPrimaryEmail(data: Record<string, unknown>): string | null {
  const primaryIdRaw =
    data.primary_email_address_id ?? data.primaryEmailAddressId;
  const primaryId =
    typeof primaryIdRaw === 'string' && primaryIdRaw.length > 0
      ? primaryIdRaw
      : null;

  const rawList =
    (Array.isArray(data.email_addresses) && data.email_addresses) ||
    (Array.isArray(data.emailAddresses) && data.emailAddresses) ||
    [];

  const normalized: Array<{ id: string; email_address: string }> = [];
  for (const entry of rawList) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id : '';
    const addrRaw =
      (typeof e.email_address === 'string' && e.email_address) ||
      (typeof e.emailAddress === 'string' && e.emailAddress) ||
      '';
    const addr = addrRaw.trim();
    if (id && addr) normalized.push({ id, email_address: addr });
  }

  if (!normalized.length) return null;

  const primary = primaryId
    ? normalized.find((x) => x.id === primaryId)
    : undefined;
  return primary?.email_address ?? normalized[0]?.email_address ?? null;
}

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

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: 'Invalid Svix signature.' }, { status: 400 });
  }

  if (event.type !== 'user.created' && event.type !== 'user.updated') {
    return NextResponse.json({ received: true, ignored: event.type }, { status: 200 });
  }

  const email = extractPrimaryEmail(event.data);
  const userData = event.data as ClerkUserCreatedEvent['data'];

  if (!email) {
    return NextResponse.json(
      {
        error: `No email available on ${event.type} event.`,
        hint:
          'Ensure the payload includes email_addresses (or emailAddresses) with at least one verified address. Clerk dashboard test events often ship without emails — use a real signup or paste a full user JSON.',
      },
      { status: 400 },
    );
  }

  const { error } = await syncClerkProfileToSupabase(
    toPayload(userData, email),
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
