import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

type User = { name: string }

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [Credentials({
        credentials: {
            name: {},
            password: {}
        },
        authorize: async (credentials) => {
            const user = await fetch(`${process.env.DATA_URL}/api/action/user/validation`, { 
                method:"POST",
                body: JSON.stringify({ userName: String(credentials.name), password: String(credentials.password) }),
                headers: {
                    Authorization: `Bearer ${process.env.USER_VALIDATION_SECRET}`,
                    'Content-type': 'application/json'
                }
            })
            .then(res => { if (!res.ok) { return null } else { return res.json() }})
            .then(j => j as User)

            if (!user) {
                // TODO No user found, need to fix error handling           
            }
        // return user object with their profile data
        return user
    },
  }),],
})