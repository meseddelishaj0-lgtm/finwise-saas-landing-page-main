import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, name, profileImage } = await request.json();

    console.log("Mobile Apple auth request:", { email, name });

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const isNewUser = !existingUser;

    let user;
    if (existingUser) {
      // EXISTING USER: Never overwrite their custom name/username/bio
      // Only update profileImage if they don't have one and one was provided
      user = await prisma.user.update({
        where: { email },
        data: {
          // Only update profile image if user doesn't have one
          ...(profileImage && !existingUser.profileImage ? { profileImage } : {}),
        },
      });
    } else {
      // NEW USER: Create with Apple-provided name as initial value
      const initialName = name || email.split("@")[0];
      user = await prisma.user.create({
        data: {
          email,
          name: initialName,
          password: "",
          profileComplete: false,
          ...(profileImage ? { profileImage } : {}),
        },
      });
    }

    console.log("User created/updated:", user.id, "isNewUser:", isNewUser);

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return NextResponse.json({
      token,
      userId: user.id,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        bio: user.bio,
        profileImage: user.profileImage,
        profileComplete: user.profileComplete,
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
