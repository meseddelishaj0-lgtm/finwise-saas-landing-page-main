import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
// @ts-ignore
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const userName = name || email.split('@')[0];

    console.log('Mobile email signup:', { email, userName });

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // User exists, just login
      const token = jwt.sign(
        { userId: user.id.toString() },
        process.env.JWT_SECRET!,
        { expiresIn: "30d" }
      );

      return res.status(200).json({
        token,
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        name: userName,
        password: "", // OAuth users don't use password authentication
      },
    });

    console.log('User created:', user.id);

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id.toString() },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    );

    return res.status(201).json({
      token,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
