/**
 * API endpoint to create or promote an admin account.
 * 
 * Usage:
 *   POST /api/admin/create
 *   Headers: { "X-Admin-Secret": "your-secret-key" }
 *   Body: {} (empty or optional)
 * 
 * Hard-coded credentials:
 *   Email: admin@test.local
 *   Password: qwerty1234
 * 
 * For Vercel deployments: Can be called via a webhook or manual request after deployment.
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Hard-coded credentials
const ADMIN_EMAIL = "admin@test.local";
const ADMIN_PASSWORD = "qwerty1234";

export async function POST(request: NextRequest) {
  try {
    // Validate secret if provided in environment
    const adminSecret = process.env.ADMIN_CREATE_SECRET;
    if (adminSecret) {
      const providedSecret = request.headers.get("X-Admin-Secret");
      if (!providedSecret || providedSecret !== adminSecret) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid or missing admin secret" },
          { status: 401 }
        );
      }
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existing) {
      // Promote existing user to admin
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { role: "admin", emailVerified: true },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Promoted existing user to admin: ${ADMIN_EMAIL}`,
          email: ADMIN_EMAIL,
          action: "promoted",
        },
        { status: 200 }
      );
    } else {
      // Create new admin account via BetterAuth
      await auth.api.signUpEmail({
        body: {
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          name: "Administrator",
        },
      });

      // Ensure the account is marked as admin and verified
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { role: "admin", emailVerified: true },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Created new admin account: ${ADMIN_EMAIL}`,
          email: ADMIN_EMAIL,
          action: "created",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating admin account:", error);
    return NextResponse.json(
      {
        error: "Failed to create admin account",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Validate secret if provided in environment
  const adminSecret = process.env.ADMIN_CREATE_SECRET;
  if (adminSecret) {
    const providedSecret = request.headers.get("X-Admin-Secret");
    if (!providedSecret || providedSecret !== adminSecret) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing admin secret" },
        { status: 401 }
      );
    }
  }

  // Return endpoint info
  return NextResponse.json({
    endpoint: "/api/admin/create",
    method: "POST",
    description: "Create or promote an admin account with hard-coded credentials",
    credentials: {
      email: ADMIN_EMAIL,
      password: "***hidden***",
    },
    headers: {
      "X-Admin-Secret": "optional (if ADMIN_CREATE_SECRET env var is set)",
    },
  });
}
