// Script to generate splash screen image with actual logo and tagline
const sharp = require('sharp');
const path = require('path');

const WIDTH = 1284;
const HEIGHT = 2778;
const BACKGROUND = '#0F172A';

async function generateSplash() {
  const logoPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const outputPath = path.join(__dirname, '..', 'assets', 'splash-icon.png');

  try {
    // Resize logo to fit splash screen (about 300px wide)
    const resizedLogo = await sharp(logoPath)
      .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    // Create tagline SVG
    const taglineSvg = `
      <svg width="${WIDTH}" height="200">
        <style>
          .tagline { fill: rgba(255,255,255,0.7); font-family: Arial, sans-serif; font-size: 32px; }
          .emphasis { fill: #FFFFFF; font-family: Arial, sans-serif; font-size: 32px; font-weight: bold; }
          .divider { fill: #88A096; }
        </style>
        <rect x="${WIDTH/2 - 40}" y="0" width="80" height="3" rx="1.5" class="divider"/>
        <text x="${WIDTH/2}" y="60" text-anchor="middle" class="tagline">Your family's second brain</text>
        <text x="${WIDTH/2}" y="110" text-anchor="middle" class="emphasis">for things that matter</text>
      </svg>
    `;

    // Create the splash screen
    await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: BACKGROUND
      }
    })
    .composite([
      {
        input: resizedLogo,
        top: Math.floor(HEIGHT / 2 - 280),
        left: Math.floor(WIDTH / 2 - 200),
      },
      {
        input: Buffer.from(taglineSvg),
        top: Math.floor(HEIGHT / 2 + 150),
        left: 0,
      }
    ])
    .png()
    .toFile(outputPath);

    console.log(`✅ Splash screen generated: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateSplash();
