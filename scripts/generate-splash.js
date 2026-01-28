// Script to generate splash screen image with logo and tagline
const sharp = require('sharp');
const path = require('path');

const WIDTH = 1284; // iPhone 14 Pro Max width
const HEIGHT = 2778; // iPhone 14 Pro Max height
const BACKGROUND = '#0F172A';
const PRIMARY = '#88A096';
const TEXT_WHITE = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255, 255, 255, 0.7)';

// SVG content for the splash screen
const svgContent = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&amp;display=swap');
    </style>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="${BACKGROUND}"/>

  <!-- Glow effect behind logo -->
  <circle cx="${WIDTH/2}" cy="${HEIGHT/2 - 100}" r="120" fill="${PRIMARY}" opacity="0.15"/>

  <!-- Logo circle -->
  <circle cx="${WIDTH/2}" cy="${HEIGHT/2 - 100}" r="80" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="3"/>

  <!-- FK text in logo -->
  <text x="${WIDTH/2}" y="${HEIGHT/2 - 75}"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="56"
        font-weight="600"
        fill="${TEXT_WHITE}"
        letter-spacing="4">FK</text>

  <!-- App name -->
  <text x="${WIDTH/2}" y="${HEIGHT/2 + 40}"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="52"
        font-weight="600"
        fill="${TEXT_WHITE}">FamilyKnows</text>

  <!-- Divider line -->
  <rect x="${WIDTH/2 - 40}" y="${HEIGHT/2 + 80}" width="80" height="3" rx="1.5" fill="${PRIMARY}"/>

  <!-- Tagline line 1 -->
  <text x="${WIDTH/2}" y="${HEIGHT/2 + 140}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="28"
        fill="${TEXT_SECONDARY}">Your family's second brain</text>

  <!-- Tagline line 2 (emphasized) -->
  <text x="${WIDTH/2}" y="${HEIGHT/2 + 180}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="28"
        font-weight="600"
        fill="${TEXT_WHITE}">for things that matter</text>
</svg>
`;

async function generateSplash() {
  const outputPath = path.join(__dirname, '..', 'assets', 'splash-icon.png');

  try {
    await sharp(Buffer.from(svgContent))
      .png()
      .toFile(outputPath);

    console.log(`✅ Splash screen generated: ${outputPath}`);
    console.log(`   Dimensions: ${WIDTH}x${HEIGHT}`);
  } catch (error) {
    console.error('❌ Error generating splash:', error.message);
    process.exit(1);
  }
}

generateSplash();
