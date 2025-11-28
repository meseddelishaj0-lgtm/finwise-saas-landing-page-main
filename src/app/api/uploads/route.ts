// api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    // Optional: Add simple token-based auth if needed
    // const authHeader = req.headers.get('authorization');
    // if (!authHeader) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const filename = `uploads/${timestamp}-${randomString}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json(
      {
        success: true,
        url: blob.url,
        filename: filename,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// GET endpoint to check if upload is working
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Vercel Blob upload endpoint is ready",
    maxSize: "5MB",
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
  });
}
