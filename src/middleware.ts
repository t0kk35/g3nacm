import { auth } from "@/auth";
import { NextResponse } from "next/server";

const SUPPORTED_LOCALES = ['en', 'fr', 'es'];

export default auth((req) => {
  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return Response.redirect(url);
  }

  // Sanitise invalid NEXT_LOCALE cookie values to prevent resolver errors
  const response = NextResponse.next();
  const localeCookie = req.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && !SUPPORTED_LOCALES.includes(localeCookie)) {
    response.cookies.set('NEXT_LOCALE', 'en', { path: '/' });
  }
  return response;
});

export const config = {
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
}
