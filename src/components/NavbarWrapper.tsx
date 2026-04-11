import { auth } from '@clerk/nextjs/server';
import { Navbar } from '@/components/Navbar';
import { isPlatformAdmin } from '@/lib/admin-access';

export async function NavbarWrapper() {
  const { userId } = await auth();
  return <Navbar showAdminLink={isPlatformAdmin(userId)} />;
}
