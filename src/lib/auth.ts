import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import type { Role } from "@/generated/prisma"
import type { Provider } from "next-auth/providers"

declare module "next-auth" {
    interface User {
        role?: Role
        nip?: string | null
        unitKerja?: string | null
        phone?: string | null
    }
    interface Session {
        user: {
            id: string
            email: string
            name: string
            image?: string | null
            role: Role
            nip?: string | null
            unitKerja?: string | null
            phone?: string | null
        }
    }
}

// Build providers array dynamically
const providers: Provider[] = []

// Add Google OAuth only if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        })
    )
}

// LDAP SSO Provider OR Fallback Credentials Provider
providers.push(
    Credentials({
        id: "ldap",
        name: "LDAP",
        credentials: {
            username: { label: "Username", type: "text" },
            password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            if (!credentials?.username || !credentials?.password) {
                return null
            }

            const username = credentials.username as string
            const password = credentials.password as string

            // Try LDAP authentication first if configured
            if (process.env.LDAP_URL) {
                try {
                    // Dynamic import to avoid edge runtime issues
                    const { authenticateWithLDAP } = await import("@/lib/ldap")

                    // Authenticate against LDAP
                    const ldapUser = await authenticateWithLDAP(username, password)

                    if (ldapUser) {
                        // Check if user exists in database
                        let user = await prisma.user.findFirst({
                            where: {
                                OR: [
                                    { nip: ldapUser.nip },
                                    { email: ldapUser.email },
                                ],
                            },
                        })

                        // Create user if not exists
                        if (!user) {
                            user = await prisma.user.create({
                                data: {
                                    id: crypto.randomUUID(),
                                    nip: ldapUser.nip,
                                    email: ldapUser.email,
                                    name: ldapUser.name,
                                    unitKerja: ldapUser.unitKerja,
                                    jabatan: ldapUser.jabatan,
                                    role: "LEARNER",
                                    updatedAt: new Date()
                                },
                            })
                        } else {
                            // Update user info from LDAP
                            user = await prisma.user.update({
                                where: { id: user.id },
                                data: {
                                    name: ldapUser.name,
                                    unitKerja: ldapUser.unitKerja || user.unitKerja,
                                    jabatan: ldapUser.jabatan || user.jabatan,
                                },
                            })
                        }

                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            role: user.role,
                            nip: user.nip,
                            unitKerja: user.unitKerja,
                        }
                    }
                } catch (error) {
                    console.error("LDAP authentication error:", error)
                    // Fall through to database check
                }
            }

            // Fallback: Check database for user with bcrypt password (for seed users)
            const bcrypt = await import("bcryptjs")

            // Try to find user by email or NIP
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: username },
                        { nip: username },
                    ],
                },
            })

            if (!user || !user.password) {
                return null
            }

            // Compare password with bcrypt
            const isValidPassword = await bcrypt.compare(password, user.password)

            if (!isValidPassword) {
                return null
            }

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                nip: user.nip,
                unitKerja: user.unitKerja,
            }
        },
    })
)

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>,
    session: { strategy: "jwt" },
    debug: true, // Enable debug mode to see errors
    pages: {
        signIn: "/login",
        error: "/login",
    },
    providers,
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                // Ensure both token.id and token.sub use the database user.id
                token.id = user.id
                token.sub = user.id  // This ensures session.user.id uses the correct ID
                token.role = user.role || "LEARNER"
                token.nip = user.nip
                token.unitKerja = user.unitKerja
                token.phone = user.phone
            }

            // Handle session update (e.g., after profile completion or profile edit)
            if (trigger === "update" && session) {
                if (session.name) token.name = session.name
                if (session.nip !== undefined) token.nip = session.nip
                if (session.unitKerja !== undefined) token.unitKerja = session.unitKerja
                if (session.phone !== undefined) token.phone = session.phone
                if (session.role) token.role = session.role
            }

            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = (token.role as Role) || "LEARNER"
                session.user.nip = token.nip as string | null
                session.user.unitKerja = token.unitKerja as string | null
                session.user.phone = token.phone as string | null
            }
            return session
        },
    },
    events: {
        async createUser({ user }) {
            // When a new user is created via OAuth, set default role and updatedAt
            if (user.id) {
                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            role: "LEARNER",
                            updatedAt: new Date(),
                        },
                    })
                } catch (error) {
                    console.error("Error updating new user:", error)
                }
            }
        },
        async linkAccount({ user }) {
            // When an account is linked, ensure updatedAt is set
            if (user.id) {
                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { updatedAt: new Date() },
                    })
                } catch (error) {
                    console.error("Error updating user on link:", error)
                }
            }
        },
    },
})
