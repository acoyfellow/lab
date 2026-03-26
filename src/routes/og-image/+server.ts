import { Resvg } from '@cf-wasm/resvg';
import type { RequestHandler } from './$types';

let cachedFont: Uint8Array | null = null;

async function loadFont(): Promise<Uint8Array> {
  if (cachedFont) return cachedFont;
  const response = await fetch(
    'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf'
  );
  cachedFont = new Uint8Array(await response.arrayBuffer());
  return cachedFont;
}

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
        `<text x="60" y="${280 + i * 70}" font-family="Inter" font-size="58" font-weight="700" fill="#FFFFFF">${escapeXml(line)}</text>`
    )
    .join('\n');

  const descText = descLines
    .map(
      (line, i) =>
        `<text x="60" y="${280 + titleLines.length * 70 + 30 + i * 32}" font-family="Inter" font-size="24" fill="#AAAAAA">${escapeXml(line)}</text>`
    )
    .join('\n');

  const iconBolt = 'M85.8 93.5C88.1 114.3 71.5 133.9 48.5 136.6C25.5 139.3 4.9 124.2 2.6 103.4C0.8 87.2 7.2 114.1 46.2 109.5C73.4 106.1 83.6 72.7 85.8 93.5Z';
  const iconLab = 'M76.6 4.5C82.5 -1.5 92.2 -1.5 98.1 4.5L128.2 34.7C134.1 40.7 134.1 50.4 128.2 56.3C122.3 62.2 112.7 62.2 106.8 56.4L103.9 59.3C116.8 85.1 112.6 117.4 91.3 138.7C64.7 165.3 22.3 165.3 -4.3 138.7C-30.9 112.1 -30.9 69.7 -4.3 43.1C17 21.8 49.4 17.6 75.2 30.6L78.1 27.7L78.1 27.7C72.2 21.7 72.2 12 78.1 6L76.6 4.5ZM91.2 13.6C90 12.4 88.1 12.4 86.9 13.6L86.9 13.6C85.7 14.8 85.7 16.7 86.9 17.9L91.2 22.2C93.7 24.7 93.7 28.7 91.3 31.2L77.3 45.3L73.2 42.8C51.5 29.8 23.3 32.6 4.8 51.1C-16.8 72.7 -16.8 108.6 4.8 130.2C26.4 151.8 62.3 151.8 83.9 130.2C102.5 111.7 105.3 83.5 92.2 61.8L89.6 57.6L108.5 39.6L117.1 48.2C118.3 49.4 120.2 49.4 121.4 48.2C122.6 47 122.6 45.1 121.4 43.9L91.2 13.6Z';

  const wordmarkB = 'M84 96H72H60H48H36H24H12H0V84V72V60V48V36V24V12V0H12H24V12V24V36V48V60V72H36H48H60H72H84H96V84V96H84Z';
  const wordmarkA = 'M192 96H180V84V72H168H156H144H132V84V96H120H108V84V72V60V48V36V24V12V0H120H132H144H156H168H180H192H204V12V24V36V48V60V72V84V96H192ZM168 48H180V36V24H168H156H144H132V36V48H144H156H168Z';
  const wordmarkL = 'M288 0H276H264H252H240H228H216V12V24V36V48V60V72V84V96H228H240H252H264H276H288H300H312V84V72V60V48V36H300V24V12V0H288ZM264 24H276V36H264H252H240V24H252H264ZM276 60H288V72H276H264H252H240V60H252H264H276Z';

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#000000"/>

  <g transform="translate(900, 350) scale(2.5)" opacity="0.08">
    <path d="${iconBolt}" fill="#FFFFFF"/>
    <path d="${iconLab}" fill="#FFFFFF"/>
  </g>

  <g transform="translate(60, 56) scale(0.5)">
    <path d="${iconBolt}" fill="#FFFFFF"/>
    <path d="${iconLab}" fill="#FFFFFF"/>
  </g>

  <g transform="translate(140, 68) scale(0.35)" fill="#FFFFFF">
    <path d="${wordmarkL}"/>
    <path d="${wordmarkA}"/>
    <path d="${wordmarkB}"/>
  </g>

  ${titleText}
  ${descText}

  <text x="60" y="590" font-family="Inter" font-size="18" font-weight="600" fill="rgba(255,255,255,0.7)">lab.coey.dev</text>
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

  const font = await loadFont();
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontBuffers: [font],
      defaultFontFamily: 'Inter',
    },
  });

  const png = resvg.render().asPng();

  const body = new Uint8Array(png).buffer;

  return new Response(body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
  });
};
