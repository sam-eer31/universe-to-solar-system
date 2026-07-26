import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const path = join(process.cwd(), 'public', 'assets', 'data', 'universe.json');
    await writeFile(path, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save JSON' }, { status: 500 });
  }
}
