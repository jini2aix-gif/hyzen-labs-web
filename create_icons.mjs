import sharp from 'sharp';
import fs from 'fs';

async function generate() {
    const svgBuffer = fs.readFileSync('public/hl_logo.svg');

    // Transparent PWA icon
    await sharp(svgBuffer)
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile('public/pwa-icon.png');

    // Transparent Apple Touch Icon
    await sharp(svgBuffer)
        .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile('public/apple-touch-icon.png');

    console.log('Icons generated successfully.');
}
generate().catch(console.error);
