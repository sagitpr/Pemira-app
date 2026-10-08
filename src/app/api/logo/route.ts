import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicDir = path.join(process.cwd(), 'public');
  const sourceImagePemira = path.join(publicDir, 'candidates', 'image', 'Image-logo-Pemira.png');
  const uploadedSource = 'C:\\Users\\ThinkPad\\.gemini\\antigravity-ide\\brain\\36ea79ac-2e3a-4fa8-9065-b6cab9573004\\.user_uploaded\\media_1791413600471.png';

  let buffer: Buffer | null = null;
  if (fs.existsSync(sourceImagePemira)) {
    buffer = fs.readFileSync(sourceImagePemira);
  } else if (fs.existsSync(uploadedSource)) {
    buffer = fs.readFileSync(uploadedSource);
  }

  if (buffer) {
    try {
      // Ensure candidate/image directory exists
      const candImgDir = path.join(publicDir, 'candidate', 'image');
      if (!fs.existsSync(candImgDir)) fs.mkdirSync(candImgDir, { recursive: true });
      fs.writeFileSync(path.join(candImgDir, 'logo-pemira.png'), buffer);

      // Ensure candidates/image directory exists
      const candsImgDir = path.join(publicDir, 'candidates', 'image');
      if (!fs.existsSync(candsImgDir)) fs.mkdirSync(candsImgDir, { recursive: true });
      fs.writeFileSync(path.join(candsImgDir, 'logo-pemira.png'), buffer);

      // Ensure public/logo.png exists
      fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
    } catch (err) {
      console.error('Error synchronizing logo files:', err);
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
}
