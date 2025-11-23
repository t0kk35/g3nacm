import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

type User = { name: string }

export const { handlers, signIn, signOut, auth } = NextAuth({
    session: {
        strategy: "jwt",
        maxAge: process.env.SESSION_MAX_AGE ? parseInt(process.env.SESSION_MAX_AGE) : 30 * 60, // Default 30 minutes in seconds
    },
    pages: {
        signIn: "/login",
    },
    providers: [Credentials({
        credentials: {
            name: {},
            password: {}
        },
        authorize: async (credentials, req) => {
            try {
                // Validate credentials are provided
                if (!credentials?.name || !credentials?.password) {
                    console.error('[Auth] Missing credentials in login attempt');
                    throw new Error('Please provide both username and password');
                }

                // Extract client information from the request
                const clientIp = req.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                               req.headers?.get('x-real-ip') ||
                               'unknown';
                const userAgent = req.headers?.get('user-agent') || 'unknown';
                const hostname = req.headers?.get('host') || 'unknown';

                // Call validation endpoint
                const response = await fetch(`${process.env.DATA_URL}/api/action/user/validation`, {
                    method:"POST",
                    body: JSON.stringify({
                        userName: String(credentials.name),
                        password: String(credentials.password),
                        clientMetadata: {
                            ip: clientIp,
                            userAgent: userAgent,
                            hostname: hostname
                        }
                    }),
                    headers: {
                        Authorization: `Bearer ${process.env.USER_VALIDATION_SECRET}`,
                        'Content-type': 'application/json'
                    }
                });

                // Handle HTTP errors
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = 'Authentication failed';

                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.error || errorJson.message || errorMessage;
                    } catch {
                        // If response is not JSON, use generic message
                    }

                    console.error(`[Auth] Authentication failed for user "${credentials.name}" from ${clientIp}:`, {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorMessage
                    });

                    // Return null to indicate auth failure (NextAuth handles this)
                    return null;
                }

                // Parse successful response
                const user = await response.json() as User;

                if (!user || !user.name) {
                    console.error('[Auth] Invalid user object returned from validation endpoint');
                    return null;
                }

                console.log(`[Auth] Successful authentication for user "${user.name}" from ${clientIp}`);
                return user;

            } catch (error) {
                // Handle network errors, timeouts, or other exceptions
                console.error('[Auth] Exception during authentication:', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    username: credentials?.name,
                    stack: error instanceof Error ? error.stack : undefined
                });
                return null;
            }
    },
  }),],
})