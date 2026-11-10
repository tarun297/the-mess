import { redirect } from 'next/navigation';

// Check-in now lives on the Home screen. Old links and bookmarks land there.
export default function Entry() {
  redirect('/home');
}
