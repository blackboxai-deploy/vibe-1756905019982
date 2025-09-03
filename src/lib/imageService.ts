import { cacheManager } from './cacheManager';

export interface GenerationRequest {
  id: string;
  width: number;
  height: number;
  text: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

class ImageService {
  private generationQueue = new Map<string, GenerationRequest>();
  private processingQueue: string[] = [];
  private isProcessing = false;

  generateImageId(width: number, height: number, text: string): string {
    const content = `${width}x${height}-${text}`;
    // Simple hash function for consistent IDs
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async requestImage(width: number, height: number, text: string): Promise<string> {
    const id = this.generateImageId(width, height, text);
    
    // Check if already generated and cached
    const cached = cacheManager.get(id);
    if (cached && cached.imageUrl) {
      return cached.imageUrl;
    }

    // Check if already in queue
    if (this.generationQueue.has(id)) {
      return id;
    }

    // Add to generation queue
    const request: GenerationRequest = {
      id,
      width,
      height,
      text,
      status: 'pending',
      createdAt: Date.now()
    };

    this.generationQueue.set(id, request);
    this.processingQueue.push(id);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  getGenerationStatus(id: string): GenerationRequest | null {
    return this.generationQueue.get(id) || cacheManager.get(id) || null;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const id = this.processingQueue.shift();
      if (!id) continue;

      const request = this.generationQueue.get(id);
      if (!request) continue;

      try {
        request.status = 'generating';
        this.generationQueue.set(id, request);

        console.log(`Generating image for: ${request.text} (${request.width}x${request.height})`);
        
        const imageUrl = await this.generateAIImage(request.text, request.width, request.height);
        
        request.status = 'completed';
        request.imageUrl = imageUrl;
        request.completedAt = Date.now();
        
        // Cache the completed request (24 hour TTL)
        cacheManager.set(id, request, 24 * 60 * 60 * 1000);
        
        console.log(`Image generation completed for: ${request.text}`);
        
      } catch (error) {
        console.error(`Image generation failed for: ${request.text}`, error);
        request.status = 'failed';
        request.error = error instanceof Error ? error.message : 'Unknown error';
        
        // Cache failed request for shorter time (5 minutes)
        cacheManager.set(id, request, 5 * 60 * 1000);
      }

      this.generationQueue.set(id, request);
    }

    this.isProcessing = false;
  }

  private async generateAIImage(prompt: string, width: number, height: number): Promise<string> {
    const response = await fetch('https://oi-server.onrender.com/chat/completions', {
      method: 'POST',
      headers: {
        'customerId': 'cus_SjQMr08npO2qMC',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer xxx'
      },
      body: JSON.stringify({
        model: 'replicate/black-forest-labs/flux-1.1-pro',
        messages: [{
          role: 'user',
          content: `Generate a high-quality image with these specifications:
Description: ${prompt}
Style: Professional, detailed, visually appealing
Quality: High resolution, crisp details
Composition: Well-balanced, aesthetically pleasing
Aspect Ratio: ${width}:${height}

Create an image that matches the description while being visually striking and professional.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`AI image generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Invalid response format from AI service');
    }

    const imageUrl = data.choices[0].message.content.trim();
    
    if (!imageUrl.startsWith('http')) {
      throw new Error('Invalid image URL received from AI service');
    }

    return imageUrl;
  }

  // Cleanup old requests periodically
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [id, request] of this.generationQueue.entries()) {
      if (now - request.createdAt > maxAge) {
        this.generationQueue.delete(id);
      }
    }
  }
}

export const imageService = new ImageService();

// Cleanup every hour
setInterval(() => {
  imageService.cleanup();
}, 60 * 60 * 1000);