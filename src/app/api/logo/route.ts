import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sourcePath = 'C:\\Users\\ThinkPad\\.gemini\\antigravity-ide\\brain\\36ea79ac-2e3a-4fa8-9065-b6cab9573004\\.user_uploaded\\media_1791413600471.png';
  const targetDir = path.join(process.cwd(), 'public');
  const targetPath = path.join(targetDir, 'logo.png');

  try {
    if (fs.existsSync(sourcePath)) {
      const buffer = fs.readFileSync(sourcePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(targetPath, buffer);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (err) {
    console.error('Error serving/writing logo:', err);
  }

  // Fallback if public/logo.png already exists
  if (fs.existsSync(targetPath)) {
    const buffer = fs.readFileSync(targetPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
}
