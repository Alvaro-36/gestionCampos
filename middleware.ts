import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtenemos la cookie que indica si hay una sesión activa
  const session = request.cookies.get('user_session');

  // Rutas protegidas que requieren sesión
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/panel') || 
    request.nextUrl.pathname.startsWith('/planeacion') ||
    request.nextUrl.pathname.startsWith('/usuarios');

  // Rutas públicas de autenticación
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');

  // 1. Si intenta acceder a una ruta protegida sin sesión, redirigir al login
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Si intenta acceder al login con una sesión activa, redirigir al panel
  if (isAuthRoute && session) {
    const panelUrl = new URL('/panel', request.url);
    return NextResponse.redirect(panelUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/panel/:path*',
    '/planeacion/:path*',
    '/usuarios/:path*',
    '/login'
  ],
};
