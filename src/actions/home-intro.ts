'use server';

import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  HOME_INTRO_DISMISSED_COOKIE,
  homeIntroDismissedCookieOptions,
} from '@/lib/home-intro-cookie';
import { createServiceSupabase } from '@/lib/supabase-service';

export async function dismissHomeIntroCard(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const { userId } = await auth();

  if (!userId) {
    const jar = await cookies();
    jar.set(HOME_INTRO_DISMISSED_COOKIE, '1', homeIntroDismissedCookieOptions);
    revalidatePath('/home');
    return { ok: true };
  }

  const supabase = createServiceSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ home_intro_dismissed: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('[dismissHomeIntroCard]', error);
    return { ok: false, error: 'Could not save your preference.' };
  }

  revalidatePath('/home');
  return { ok: true };
}
