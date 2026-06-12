import { redirect } from 'next/navigation';

/** App entry: everyone lands on Home (anonymous preview or full catalog when signed in). */
export default function RootPage() {
  redirect('/home');
}
