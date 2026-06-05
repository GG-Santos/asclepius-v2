"use client";

import { createAuthClient } from "better-auth/react";

// baseURL defaults to the current origin in the browser, which is what we want.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession, getSession } = authClient;
