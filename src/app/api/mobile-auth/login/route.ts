import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// Create fresh connection to avoid stale reads from Neon replicas
function createFreshPrisma() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export async function POST(request: NextRequest) {
  const prisma = createFreshPrisma();

  try {
    const { email, password } = await request.json();

    console.log("Mobile login request:", { email });

    if (!email || !password) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user with fresh connection to get latest data
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user has a password (might be OAuth user)
    if (!user.password) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: "Please sign in with Google or Apple" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("User logged in:", user.id, "name:", user.name, "username:", user.username);

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    await prisma.$disconnect();
    return NextResponse.json({
      token,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        bio: user.bio,
        location: user.location,
        website: user.website,
        profileImage: user.profileImage,
        bannerImage: user.bannerImage,
        profileComplete: user.profileComplete,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    await prisma.$disconnect();
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
