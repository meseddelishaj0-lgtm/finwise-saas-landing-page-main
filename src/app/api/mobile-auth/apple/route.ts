import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    console.log("Mobile Apple auth request:", { email, name });

    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      );
    }

    // Find or create user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
      },
      create: {
        email,
        name,
        password: "",
      },
    });

    console.log("User created/updated:", user.id);

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      token,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Apple auth error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
