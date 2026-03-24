// src\middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Ler o Cookie de Autenticação (O "Crachá")
  // O login.ts que criamos salva o cookie 'sigma_auth'
  const token = request.cookies.get('sigma_auth');
  
  // 2. Descobrir onde o usuário quer ir
  const { pathname } = request.nextUrl;
  
  // Rotas que não precisam de senha (Públicas)
  const publicRoutes = ['/login', '/_next', '/static', '/favicon.ico', '/file.svg', '/globe.svg', '/window.svg', '/vercel.svg'];
  
  // Verifica se é rota pública (usando startsWith para pegar subarquivos)
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  /* =========================================================
     🛑 [SEGURANÇA DESATIVADA TEMPORARIAMENTE] 🛑
     As validações abaixo foram comentadas conforme solicitado
     para liberar o acesso livre e evitar bloqueios pelo T.I.
  ========================================================= */

  /*
  // === REGRA 1: PROTEÇÃO TOTAL ===
  // Se não tem token E não é rota pública -> Manda pro Login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Opcional: Salvar de onde ele veio para redirecionar depois
    // loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
  */

  /*
  // === REGRA 2: USUÁRIO LOGADO NÃO VÊ LOGIN ===
  // Se tem token E tentou entrar no login -> Manda pro Dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  */

  // ✅ Se passou por tudo (e com a segurança desativada), libera o acesso total!
  return NextResponse.next();
}

// Configuração: Onde o middleware deve rodar
export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, EXCETO arquivos estáticos e API
     * (A API pode ter sua própria proteção se necessário)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};