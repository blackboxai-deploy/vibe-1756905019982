import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/lib/imageService';
import { generatePlaceholderSVG } from '@/lib/placeholderGenerator';
import { cacheManager } from '@/lib/cacheManager';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  try {
    const params = await context.params;
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract dimensions from URL path after /api/placeholder/params/
    const dimensionIndex = pathSegments.findIndex(segment => segment === 'params') + 1;
    const dimensionStr = pathSegments[dimensionIndex] || params.slug?.[0];
    
    if (!dimensionStr) {
      return NextResponse.json({ error: 'Missing image parameters' }, { status: 400 });
    }

    // Parse dimensions (e.g., "800x600")
    const dimensionMatch = dimensionStr.match(/^(\d+)x(\d+)$/);
    
    if (!dimensionMatch) {
      return NextResponse.json({ error: 'Invalid dimension format. Use WIDTHxHEIGHT (e.g., 800x600)' }, { status: 400 });
    }

    const width = parseInt(dimensionMatch[1]);
    const height = parseInt(dimensionMatch[2]);

    // Validate dimensions
    if (width < 1 || height < 1 || width > 2048 || height > 2048) {
      return NextResponse.json({ error: 'Dimensions must be between 1x1 and 2048x2048' }, { status: 400 });
    }

    // Get text from query parameters
    const searchParams = url.searchParams;
    const text = searchParams.get('text') || searchParams.get('t') || `${width}×${height} Placeholder`;

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

// Handle HEAD requests for checking image status
export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  try {
    const params = await context.params;
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    const dimensionIndex = pathSegments.findIndex(segment => segment === 'params') + 1;
    const dimensionStr = pathSegments[dimensionIndex] || params.slug?.[0];
    
    if (!dimensionStr) {
      return new NextResponse(null, { status: 400 });
    }

    const dimensionMatch = dimensionStr.match(/^(\d+)x(\d+)$/);
    
    if (!dimensionMatch) {
      return new NextResponse(null, { status: 400 });
    }

    const width = parseInt(dimensionMatch[1]);
    const height = parseInt(dimensionMatch[2]);
    const searchParams = url.searchParams;
    const text = searchParams.get('text') || searchParams.get('t') || `${width}×${height} Placeholder`;

    const imageId = imageService.generateImageId(width, height, text);
    const status = imageService.getGenerationStatus(imageId);

    if (status && status.status === 'completed' && status.imageUrl) {
      return new NextResponse(null, {
        headers: {
          'X-Image-Status': 'completed',
          'X-Image-ID': imageId,
          'Cache-Control': 'public, max-age=86400',
          'ETag': `"ai-${imageId}"`
        }
      });
    }

    return new NextResponse(null, {
      headers: {
        'X-Image-Status': status?.status || 'pending',
        'X-Image-ID': imageId,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}