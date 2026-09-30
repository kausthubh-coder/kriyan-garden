import { createClerkClient } from "@clerk/backend";

/** Verify the actual bearer with Clerk, including the intended resource. */
export async function verifyUserOAuth(bearerToken: string | undefined, resource: string) {
  if (!bearerToken) return undefined;
  try {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY, publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });
    const verified = await client.idPOAuthAccessToken.verify(bearerToken, { audience: resource });
    if (!verified.aud?.includes(resource) || !verified.subject.startsWith("user_") || verified.revoked || verified.expired) return undefined;
    return { token: bearerToken, clientId: verified.clientId, scopes: verified.scopes,
      ...(verified.expiration === null ? {} : { expiresAt: verified.expiration }), extra: { userId: verified.subject } };
  } catch { return undefined; }
}
