const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = typeof pngToIcoModule === 'function' ? pngToIcoModule : (pngToIcoModule.default || pngToIcoModule);

async function downloadLatestSvg() {
  const targetPath = path.join(__dirname, 'src', 'overdesk.svg');
  const url = 'https://raw.githubusercontent.com/Bl3551nq/Overdesk-Logos/refs/heads/main/overdesk.svg';
  console.log(`Downloading latest SVG from ${url}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.includes('<svg') && text.includes('</svg>')) {
      // Ensure target directory exists
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, text, 'utf8');
      console.log('✓ Successfully downloaded and updated src/overdesk.svg from remote!');
      return text;
    } else {
      console.log('Downloaded file does not appear to be a valid SVG. Keeping existing local version.');
    }
  } catch (err) {
    console.log('Note: Failed to download SVG from remote:', err.message, '- Using local backup in src/overdesk.svg');
  }
  
  // Fallback to local
  if (fs.existsSync(targetPath)) {
    return fs.readFileSync(targetPath, 'utf8');
  }
  
  throw new Error('No SVG logo file found locally or remotely.');
}

async function getIconBuffer(svgContent, targetSize, innerRatio = 0.94) {
  // 1. Render raw SVG into a high-res 1024x1024 canvas first to ensure high-quality trimming
  const rawHighRes = await sharp(Buffer.from(svgContent))
    .resize(1024, 1024)
    .png()
    .toBuffer();

  // 2. Trim all excessive transparent margins around the emblem
  const trimmed = await sharp(rawHighRes)
    .trim()
    .toBuffer();

  // 3. Define target padded size based on innerRatio
  const paddedSize = Math.max(1, Math.round(targetSize * innerRatio));

  // 4. Resize our perfectly trimmed emblem to the padded size
  const resized = await sharp(trimmed)
    .resize(paddedSize, paddedSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // 5. Extend with transparent borders to make it precisely targetSize x targetSize
  const topPad = Math.round((targetSize - paddedSize) / 2);
  const leftPad = Math.round((targetSize - paddedSize) / 2);
  const bottomPad = targetSize - paddedSize - topPad;
  const rightPad = targetSize - paddedSize - leftPad;

  const finalBuffer = await sharp(resized)
    .extend({
      top: topPad,
      bottom: bottomPad,
      left: leftPad,
      right: rightPad,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  return finalBuffer;
}

async function main() {
  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  // 1. Resolve & load SVG logo content (remote-first, with local fallback)
  const svgLogoText = await downloadLatestSvg();

  console.log('Generating logo PNG from SVG with smart auto-trimming for Electron Desktop...');
  
  // Render high fidelity 512x512 logo
  const png512Buffer = await getIconBuffer(svgLogoText, 512, 0.94);
    
  // Export 512x512 icon for macOS/general use
  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512Buffer);
  
  const electronDir = path.join(__dirname, 'electron');
  if (!fs.existsSync(electronDir)) {
    fs.mkdirSync(electronDir, { recursive: true });
  }
  fs.writeFileSync(path.join(electronDir, 'icon.png'), png512Buffer);
  console.log('✓ Created build/icon.png and electron/icon.png (512x512 with smart ratio)');

  // Generate PNGs at all key Windows resolutions
  const sizes = [16, 24, 32, 36, 48, 64, 128, 256];
  const filePaths = [];
  for (const size of sizes) {
    const buffer = await getIconBuffer(svgLogoText, size, 0.94);
    const filePath = path.join(buildDir, `temp-icon-${size}.png`);
    fs.writeFileSync(filePath, buffer);
    filePaths.push(filePath);
  }

  console.log('Converting multiple PNG layers to unified ICO format for Windows...');
  try {
    const icoBuffer = await pngToIco(filePaths);
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
    fs.writeFileSync(path.join(electronDir, 'icon.ico'), icoBuffer);
    console.log('✓ Created build/icon.ico and electron/icon.ico (8 layers inside)');
  } catch (err) {
    console.error('Failed to convert ICO:', err);
  }

  // Cleanup temp files
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // 2. Generate launcher icons for Android (Capacitor) if the directory exists
  const androidResDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidResDir)) {
    console.log('Android layout directory found! Generating high-fidelity launcher icons from SVG...');

    const androidMipmaps = [
      { name: 'mipmap-mdpi', stdSize: 48, foreSize: 108 },
      { name: 'mipmap-hdpi', stdSize: 72, foreSize: 162 },
      { name: 'mipmap-xhdpi', stdSize: 96, foreSize: 216 },
      { name: 'mipmap-xxhdpi', stdSize: 144, foreSize: 324 },
      { name: 'mipmap-xxxhdpi', stdSize: 192, foreSize: 432 }
    ];

    for (const mip of androidMipmaps) {
      const mipDir = path.join(androidResDir, mip.name);
      if (fs.existsSync(mipDir)) {
        // A. Standard ic_launcher.png (non-adaptive round/squircle) - 0.85 safe ratio
        const stdBuffer = await getIconBuffer(svgLogoText, mip.stdSize, 0.85);
        fs.writeFileSync(path.join(mipDir, 'ic_launcher.png'), stdBuffer);

        // B. Round ic_launcher_round.png - 0.85 safe ratio
        const roundBuffer = await getIconBuffer(svgLogoText, mip.stdSize, 0.85);
        fs.writeFileSync(path.join(mipDir, 'ic_launcher_round.png'), roundBuffer);

        // C. Adaptive foreground ic_launcher_foreground.png - 0.60 safe ratio to sit safely inside circular clipping
        const foreBuffer = await getIconBuffer(svgLogoText, mip.foreSize, 0.60);
        fs.writeFileSync(path.join(mipDir, 'ic_launcher_foreground.png'), foreBuffer);

        console.log(`  ✓ Generated icon set (standard, round, foreground) for android/res/${mip.name}`);
      }
    }
  } else {
    console.log('Android path not found or not active. Skipping Android asset generation.');
  }
  
  console.log('✓ Done generating asset resources successfully!');
}

main().catch(console.error);
