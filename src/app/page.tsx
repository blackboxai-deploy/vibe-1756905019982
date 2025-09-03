'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface ImageStatus {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  width: number;
  height: number;
  text: string;
  imageUrl?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
  processingTime?: number;
}

export default function PlaceholderImageService() {
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [text, setText] = useState('Beautiful mountain landscape at sunset');
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [imageStatus, setImageStatus] = useState<ImageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [examples] = useState([
    { width: 400, height: 300, text: 'Modern office workspace with natural lighting' },
    { width: 800, height: 400, text: 'Cozy coffee shop interior with warm ambiance' },
    { width: 600, height: 600, text: 'Abstract geometric pattern in blue and gold' },
    { width: 1200, height: 600, text: 'Serene beach scene with crystal clear water' },
  ]);

  const generateImage = async () => {
    if (width < 1 || height < 1 || width > 2048 || height > 2048) {
      alert('Dimensions must be between 1x1 and 2048x2048');
      return;
    }

    setIsLoading(true);
    const imageUrl = `/api/placeholder?w=${width}&h=${height}&text=${encodeURIComponent(text)}`;
    setCurrentImageUrl(imageUrl);

    try {
      // Get the image ID from response headers
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const imageId = response.headers.get('X-Image-ID');
      
      if (imageId) {
        // Start polling for status updates
        pollImageStatus(imageId);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setIsLoading(false);
    }
  };

  const pollImageStatus = async (imageId: string) => {
    const maxAttempts = 40; // 40 * 3 seconds = 2 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/status/${imageId}`);
        if (response.ok) {
          const status: ImageStatus = await response.json();
          setImageStatus(status);

          if (status.status === 'completed' || status.status === 'failed') {
            setIsLoading(false);
            if (status.status === 'completed') {
              // Force refresh the image after completion
              setTimeout(() => {
                const newUrl = `/api/placeholder?w=${width}&h=${height}&text=${encodeURIComponent(text)}&t=${Date.now()}`;
                setCurrentImageUrl(newUrl);
              }, 1000);
            }
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000); // Poll every 3 seconds
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error polling status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setIsLoading(false);
        }
      }
    };

    poll();
  };

  const loadExample = (example: typeof examples[0]) => {
    setWidth(example.width);
    setHeight(example.height);
    setText(example.text);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'generating': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgress = (status: string) => {
    switch (status) {
      case 'pending': return 10;
      case 'generating': return 60;
      case 'completed': return 100;
      case 'failed': return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Dynamic Placeholder Image Service
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Generate placeholder images that automatically upgrade to AI-generated content. 
            Get instant placeholders while AI creates beautiful, contextual images in the background.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Image Generator</CardTitle>
              <CardDescription>
                Configure your image dimensions and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Math.max(1, Math.min(2048, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="2048"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Math.max(1, Math.min(2048, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="2048"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="text">Image Description</Label>
                <Textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  rows={3}
                />
              </div>

              {/* Generate Button */}
              <Button 
                onClick={generateImage} 
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Generating...' : 'Generate Image'}
              </Button>

              {/* Status Display */}
              {imageStatus && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generation Status</span>
                    <Badge className={getStatusColor(imageStatus.status)}>
                      {imageStatus.status}
                    </Badge>
                  </div>
                  
                  <Progress value={getProgress(imageStatus.status)} className="h-2" />
                  
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>ID: {imageStatus.id}</div>
                    <div>Created: {new Date(imageStatus.createdAt).toLocaleTimeString()}</div>
                    {imageStatus.processingTime && (
                      <div>Processing Time: {(imageStatus.processingTime / 1000).toFixed(1)}s</div>
                    )}
                    {imageStatus.error && (
                      <div className="text-red-600">Error: {imageStatus.error}</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Your image will appear here - starts as placeholder, upgrades to AI-generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentImageUrl ? (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <img 
                      src={currentImageUrl}
                      alt={text}
                      className="w-full h-auto"
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                      onError={(e) => {
                        console.error('Image load error:', e);
                      }}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
                    <div className="space-y-2">
                      <div className="text-4xl">🖼️</div>
                      <div>Click "Generate Image" to create your placeholder</div>
                    </div>
                  </div>
                )}

                {currentImageUrl && (
                  <div className="text-xs text-slate-600 font-mono break-all bg-slate-100 p-2 rounded">
                    {currentImageUrl}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Examples Section */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Examples</CardTitle>
            <CardDescription>
              Try these preset configurations to see the service in action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {examples.map((example, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">
                        {example.width}×{example.height}
                      </div>
                      <div className="text-xs text-slate-600">
                        {example.text}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => loadExample(example)}
                      >
                        Load Example
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>API Usage</CardTitle>
            <CardDescription>
              How to use this service in your applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Basic Usage</h4>
                <code className="block bg-slate-100 p-3 rounded text-sm">
                  /api/placeholder?w=800&h=600&text=Your+image+description
                </code>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Parameters</h4>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li><strong>w/width</strong>: Image width (1-2048)</li>
                  <li><strong>h/height</strong>: Image height (1-2048)</li>
                  <li><strong>text/t</strong>: Image description for AI generation</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">How it works</h4>
                <ol className="text-sm space-y-1 text-slate-600 list-decimal list-inside">
                  <li>First request returns SVG placeholder immediately</li>
                  <li>AI image generation starts in background</li>
                  <li>Same URL automatically serves AI image once ready</li>
                  <li>Use status endpoint to monitor generation progress</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}