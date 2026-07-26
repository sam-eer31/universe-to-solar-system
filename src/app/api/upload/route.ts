import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/assets/images
    // Generating a unique safe filename
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = join(process.cwd(), 'public', 'assets', 'images', filename);

    await writeFile(path, buffer);

    return NextResponse.json({ 
      success: true, 
      imageUrl: `/assets/images/${filename}` 
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}
