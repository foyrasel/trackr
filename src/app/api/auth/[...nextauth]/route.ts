import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

// Simple hash function matching the one used in register
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.NEXTAUTH_SECRET || 'trackr-secret'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Only include OAuth providers if they have real (non-dummy) credentials
const providers: any[] = []

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET &&
    process.env.GOOGLE_ID !== 'dummy-google-id' &&
    process.env.GOOGLE_ID !== 'your-google-client-id') {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    })
  )
}

if (process.env.FACEBOOK_ID && process.env.FACEBOOK_SECRET &&
    process.env.FACEBOOK_ID !== 'dummy-facebook-id' &&
    process.env.FACEBOOK_ID !== 'your-facebook-app-id') {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
    })
  )
}

if (process.env.APPLE_ID && process.env.APPLE_SECRET &&
    process.env.APPLE_ID !== 'dummy-apple-id' &&
    process.env.APPLE_ID !== 'your-apple-service-id') {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    })
  )
}

// Email + Password credentials provider
providers.push(
  CredentialsProvider({
    id: 'credentials',
    name: 'Email & Password',
    credentials: {
      email: { label: 'Email', type: 'email', placeholder: 'Email address' },
      password: { label: 'Password', type: 'password', placeholder: 'Password' },
    },
    async authorize(credentials) {
      if (!credentials) return null

      // Email + Password login (required)
      if (!credentials.email || !credentials.password) return null

      const user = await db.user.findUnique({
        where: { email: credentials.email },
      })

      if (!user || !user.password) return null

      const hashedInput = await hashPassword(credentials.password)
      if (user.password !== hashedInput) return null

      // Check if email is verified
      if (!user.emailVerified) return null

      return { id: user.id, name: user.name, email: user.email, image: user.image }
    },
  })
)

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'facebook' || account?.provider === 'apple') {
        // Create or update user in DB for OAuth providers
        const existingUser = await db.user.findFirst({
          where: { email: user.email || undefined },
        })
        if (!existingUser) {
          const newUser = await db.user.create({
            data: {
              name: user.name || 'User',
              email: user.email,
              image: user.image,
              provider: account.provider,
              emailVerified: new Date(), // OAuth emails are considered verified
            },
          })
          // Create default accounts
          await db.account.createMany({
            data: [
              { userId: newUser.id, name: 'Cash', type: 'cash', balance: 0, color: '#10b981', icon: '💵', isDefault: true },
              { userId: newUser.id, name: 'Debit Card', type: 'debit', balance: 0, color: '#3b82f6', icon: '💳', isDefault: false },
              { userId: newUser.id, name: 'Credit Card', type: 'credit', balance: 0, color: '#8b5cf6', icon: '💳', isDefault: false },
              { userId: newUser.id, name: 'Mobile Wallet', type: 'mobile', balance: 0, color: '#a855f7', icon: '📱', isDefault: false },
            ],
          })
          user.id = newUser.id
        } else {
          user.id = existingUser.id
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
