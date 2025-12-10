// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from '@vercel/blob';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET endpoint to check if upload is working
export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      message: "Vercel Blob upload endpoint is ready",
      maxSize: "5MB",
      allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
    },
    { headers: corsHeaders }
  );
}

// POST endpoint to upload file
export async function POST(req: NextRequest) {
  try {
    console.log("📷 Upload request received");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    console.log("📦 File received:", file?.name, file?.type, file?.size);

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded. Make sure field name is 'file'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only images are allowed.` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || 'jpg';
    const filename = `uploads/${timestamp}-${randomString}.${extension}`;

    console.log("📤 Uploading to Vercel Blob:", filename);

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    console.log("✅ Upload successful:", blob.url);

    return NextResponse.json(
      {
        success: true,
        url: blob.url,
        filename: filename,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("❌ Error uploading file:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file" },
      { status: 500, headers: corsHeaders }
    );
  }
}
