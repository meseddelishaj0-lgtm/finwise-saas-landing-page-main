import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
// @ts-ignore
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.userId, 10) },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}
