import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige al usuario al panel de inicio de sesión automáticamente
  redirect('/login');
}
