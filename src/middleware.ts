import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  const response = NextResponse.next()

  if (!localeCookie || (localeCookie !== 'en' && localeCookie !== 'ne')) {
    response.cookies.set('NEXT_LOCALE', 'en', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|media).*)',
  ],
}
