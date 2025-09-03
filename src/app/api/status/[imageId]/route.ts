import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/lib/imageService';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await context.params;
    
    if (!imageId) {
      return NextResponse.json({ error: 'Missing image ID' }, { status: 400 });
    }

    const status = imageService.getGenerationStatus(imageId);
    
    if (!status) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const response = {
      id: status.id,
      status: status.status,
      width: status.width,
      height: status.height,
      text: status.text,
      imageUrl: status.imageUrl,
      error: status.error,
      createdAt: status.createdAt,
      completedAt: status.completedAt,
      processingTime: status.completedAt ? status.completedAt - status.createdAt : null
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': status.status === 'completed' ? 'public, max-age=3600' : 'no-cache'
      }
    });

  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}