'use client';

import { phoneNumberClient, twoFactorClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Same-origin auth client (cookies are httpOnly; the browser never sees tokens). */
export const authClient = createAuthClient({
  plugins: [twoFactorClient(), phoneNumberClient()],
});
