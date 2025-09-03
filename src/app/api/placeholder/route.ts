import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/lib/imageService';
import { generatePlaceholderSVG } from '@/lib/placeholderGenerator';
import { cacheManager } from '@/lib/cacheManager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get dimensions from query parameters
    const width = parseInt(searchParams.get('w') || searchParams.get('width') || '400');
    const height = parseInt(searchParams.get('h') || searchParams.get('height') || '300');
    const text = searchParams.get('text') || searchParams.get('t') || `${width}×${height} Placeholder`;

    // Validate dimensions
    if (width < 1 || height < 1 || width > 2048 || height > 2048) {
      return NextResponse.json({ error: 'Dimensions must be between 1x1 and 2048x2048' }, { status: 400 });
    }

    // Generate unique ID for this request
    const imageId = imageService.generateImageId(width, height, text);
    
    // Check if AI image is already generated
    const existingRequest = cacheManager.get(imageId);
    if (existingRequest && existingRequest.status === 'completed' && existingRequest.imageUrl) {
      // Return redirect to AI-generated image with long cache
      const response = NextResponse.redirect(existingRequest.imageUrl);
      response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 24 hours
      response.headers.set('ETag', `"ai-${imageId}"`);
      return response;
    }

    // Start AI image generation (async)
    imageService.requestImage(width, height, text);

    // Return immediate placeholder response
    const placeholderSVG = generatePlaceholderSVG(width, height, text);
    
    const response = new NextResponse(placeholderSVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutes for placeholder
        'ETag': `"placeholder-${imageId}"`,
        'X-Image-Status': 'generating',
        'X-Image-ID': imageId,
        'X-Refresh-After': '30' // Suggest client refresh after 30 seconds
      }
    });

    return response;

  } catch (error) {
    console.error('Placeholder API error:', error);
    
    // Return a basic error placeholder
    const errorSVG = generatePlaceholderSVG(400, 300, 'Error loading image', '#fee2e2', '#dc2626');
    return new NextResponse(errorSVG, {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    });
  }
}