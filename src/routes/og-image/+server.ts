import { Resvg } from '@cf-wasm/resvg';
import type { RequestHandler } from './$types';

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) currentLine = testLine;
    else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function generateOGImageSVG(title: string, description: string): string {
  const titleLines = wrapText(title, 30).slice(0, 3);
  const descLines = description ? wrapText(description, 50).slice(0, 2) : [];

  const titleText = titleLines
    .map(
      (line, i) =>
        `<text x="60" y="${260 + i * 70}" font-size="58" font-weight="700" fill="#FFFFFF">${escapeXml(line)}</text>`
    )
    .join('\n');

  const descText = descLines
    .map(
      (line, i) =>
        `<text x="60" y="${260 + titleLines.length * 70 + 30 + i * 32}" font-size="24" fill="rgba(255,255,255,0.8)">${escapeXml(line)}</text>`
    )
    .join('\n');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#000000"/>
  ${titleText}
  ${descText}
  <text x="60" y="590" font-size="18" font-weight="600" fill="rgba(255,255,255,0.7)">lab.coey.dev</text>
</svg>`;
}

export const GET: RequestHandler = async ({ url }) => {
  const title = url.searchParams.get('title') || 'lab.coey.dev';
  const description = url.searchParams.get('description') || '';
  const format = url.searchParams.get('format');

  const svg = generateOGImageSVG(title, description);

  if (format === 'svg') {
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });

  const png = resvg.render().asPng();

  const body = new Uint8Array(png).buffer;

  return new Response(body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};

