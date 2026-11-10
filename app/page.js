import { redirect } from 'next/navigation';

// The middleware sends "/" to each role's home. This is only a fallback.
export default function Start() {
  redirect('/login');
}
