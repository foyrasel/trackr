import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

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

// Always include the credentials provider for easy name-based login
providers.push(
  CredentialsProvider({
    name: 'Demo Login',
    credentials: {
      name: { label: 'Name', type: 'text', placeholder: 'Your name' },
    },
    async authorize(credentials) {
      if (!credentials?.name) return null

      let user = await db.user.findFirst({ where: { name: credentials.name } })
      if (!user) {
        user = await db.user.create({
          data: {
            name: credentials.name,
            provider: 'demo',
          },
        })
        // Create default accounts for new user
        await db.account.createMany({
          data: [
            { userId: user.id, name: 'Cash', type: 'cash', balance: 0, color: '#10b981', icon: '💵', isDefault: true },
            { userId: user.id, name: 'Debit Card', type: 'debit', balance: 0, color: '#3b82f6', icon: '💳', isDefault: false },
            { userId: user.id, name: 'Credit Card', type: 'credit', balance: 0, color: '#8b5cf6', icon: '💳', isDefault: false },
            { userId: user.id, name: 'Mobile Wallet', type: 'mobile', balance: 0, color: '#a855f7', icon: '📱', isDefault: false },
          ],
        })
      }
      return { id: user.id, name: user.name, email: user.email, image: user.image }
    },
  })
)

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'facebook') {
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
