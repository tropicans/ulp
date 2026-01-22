import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public routes that don't require authentication
    const publicRoutes = ["/", "/login", "/register", "/seed"]
    const isPublicRoute = publicRoutes.some(route => pathname === route) ||
        pathname.startsWith("/login/") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/courses") ||
        pathname.startsWith("/verify") ||
        /\.(.*)$/.test(pathname) // Allow all files with extensions (static assets)

    // Get token from JWT
    const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET
    })

    // If not logged in and trying to access protected route
    if (!token && !isPublicRoute) {
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // If logged in and trying to access login
    if (token && pathname === "/login") {
        // Check if profile is complete (has organization)
        if (!token.unitKerja) {
            return NextResponse.redirect(new URL("/complete-profile", request.url))
        }
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // If logged in but profile incomplete, redirect to complete-profile
    // (except when already on complete-profile page)
    if (token && !isPublicRoute && pathname !== "/complete-profile") {
        if (!token.unitKerja) {
            return NextResponse.redirect(new URL("/complete-profile", request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - logo.png, logo.svg, etc (root assets)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
}
