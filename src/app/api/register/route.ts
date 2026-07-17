import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "register", 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      // Never return the full row — it includes the password hash, reset code, etc.
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ message: "User created", user });
  } catch (error: any) {
    console.error("❌ Register Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
