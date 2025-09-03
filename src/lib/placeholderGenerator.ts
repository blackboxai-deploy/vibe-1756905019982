export function generatePlaceholderSVG(
  width: number,
  height: number,
  text: string,
  backgroundColor = '#f3f4f6',
  textColor = '#6b7280'
): string {
  // Calculate font size based on dimensions
  const avgDimension = (width + height) / 2;
  const baseFontSize = Math.max(12, Math.min(48, avgDimension / 8));
  
  // Split text into lines if too long
  const maxCharsPerLine = Math.floor(width / (baseFontSize * 0.6));
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  // Limit to maximum 4 lines
  const displayLines = lines.slice(0, 4);
  
  // Calculate text positioning
  const lineHeight = baseFontSize * 1.2;
  const totalTextHeight = displayLines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + baseFontSize;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <rect x="2" y="2" width="${width-4}" height="${height-4}" 
            fill="none" stroke="${textColor}" stroke-width="2" stroke-dasharray="10,5" opacity="0.5"/>
      
      <!-- Corner indicators -->
      <circle cx="20" cy="20" r="3" fill="${textColor}" opacity="0.3"/>
      <circle cx="${width-20}" cy="20" r="3" fill="${textColor}" opacity="0.3"/>
      <circle cx="20" cy="${height-20}" r="3" fill="${textColor}" opacity="0.3"/>
      <circle cx="${width-20}" cy="${height-20}" r="3" fill="${textColor}" opacity="0.3"/>
      
      <!-- Dimensions indicator -->
      <text x="${width/2}" y="25" font-family="Arial, sans-serif" font-size="${Math.max(10, baseFontSize * 0.6)}" 
            fill="${textColor}" text-anchor="middle" opacity="0.6">
        ${width} × ${height}
      </text>
      
      <!-- Main text -->
      <g transform="translate(${width/2}, ${startY})">
        ${displayLines.map((line, index) => `
          <text y="${index * lineHeight}" font-family="Arial, sans-serif" font-size="${baseFontSize}" 
                fill="${textColor}" text-anchor="middle" opacity="0.8">
            ${escapeXml(line)}
          </text>
        `).join('')}
      </g>
      
      <!-- Loading indicator -->
      <g transform="translate(${width/2}, ${height - 40})">
        <circle cx="0" cy="0" r="3" fill="${textColor}" opacity="0.4">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <text y="20" font-family="Arial, sans-serif" font-size="${Math.max(10, baseFontSize * 0.5)}" 
              fill="${textColor}" text-anchor="middle" opacity="0.5">
          Generating AI image...
        </text>
      </g>
    </svg>
  `;

  return svg.trim();
}

export function generatePlaceholderDataURL(
  width: number,
  height: number,
  text: string,
  backgroundColor?: string,
  textColor?: string
): string {
  const svg = generatePlaceholderSVG(width, height, text, backgroundColor, textColor);
  // Use btoa for browser compatibility, fallback to Buffer for Node.js
  const base64 = typeof btoa !== 'undefined' 
    ? btoa(svg)
    : (global as any).Buffer?.from(svg).toString('base64') || svg;
  return `data:image/svg+xml;base64,${base64}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}