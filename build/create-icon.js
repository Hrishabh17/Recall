const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Create iconset directory
const iconsetDir = path.join(__dirname, 'icon.iconset');
if (!fs.existsSync(iconsetDir)) {
  fs.mkdirSync(iconsetDir, { recursive: true });
}

// SVG to PNG conversion sizes needed for .icns
const sizes = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
];

const svgPath = path.join(__dirname, 'icon.svg');

console.log('Converting SVG to PNG files...');

// Try using rsvg-convert first (if librsvg is installed via Homebrew)
let useRsvg = false;
try {
  execSync('which rsvg-convert', { stdio: 'ignore' });
  useRsvg = true;
  console.log('Using rsvg-convert...');
} catch (e) {
  console.log('rsvg-convert not found, trying alternative method...');
}

if (useRsvg) {
  sizes.forEach(({ name, size }) => {
    const outputPath = path.join(iconsetDir, name);
    try {
      execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${outputPath}"`);
      console.log(`Created ${name}`);
    } catch (error) {
      console.error(`Error creating ${name}:`, error.message);
    }
  });
} else {
  // Fallback: Use qlmanage (macOS built-in) - but it requires manual conversion
  // Or use a web-based approach
  console.log('\nPlease install librsvg for automatic conversion:');
  console.log('  brew install librsvg');
  console.log('\nOr manually convert icon.svg to PNG files at the required sizes:');
  sizes.forEach(({ name, size }) => {
    console.log(`  ${name} - ${size}x${size}px`);
  });
  console.log('\nThen run: iconutil -c icns icon.iconset -o icon.icns');
  process.exit(1);
}

// Create .icns file using iconutil
console.log('\nCreating .icns file...');
try {
  execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(__dirname, 'icon.icns')}"`);
  console.log('✓ Successfully created icon.icns');
  
  // Keep iconset directory for reference (contains all PNG sizes)
  console.log('✓ PNG files are available in icon.iconset/ directory');
  console.log('\nAvailable icon sizes in icon.icns:');
  sizes.forEach(({ name, size }) => {
    console.log(`  ${name} - ${size}x${size}px`);
  });
} catch (error) {
  console.error('Error creating .icns file:', error.message);
  process.exit(1);
}

// Create Windows .ico file (if ImageMagick is available)
console.log('\nChecking for Windows .ico support...');
try {
  execSync('which convert', { stdio: 'ignore' });
  console.log('Creating Windows icon.ico...');
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoFiles = icoSizes.map(size => 
    path.join(iconsetDir, `icon_${size}x${size}.png`)
  ).join(' ');
  
  // Create individual PNGs for Windows if they don't exist
  icoSizes.forEach(size => {
    const outputPath = path.join(iconsetDir, `icon_${size}x${size}.png`);
    if (!fs.existsSync(outputPath)) {
      execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${outputPath}"`);
    }
  });
  
  execSync(`convert ${icoFiles} "${path.join(__dirname, 'icon.ico')}"`);
  console.log('✓ Successfully created icon.ico for Windows');
} catch (e) {
  console.log('  ImageMagick not found - skipping Windows .ico creation');
  console.log('  Install with: brew install imagemagick');
}

// Create Linux PNG files
console.log('\nCreating Linux PNG files...');
const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512];
const linuxDir = path.join(__dirname, 'linux');
if (!fs.existsSync(linuxDir)) {
  fs.mkdirSync(linuxDir, { recursive: true });
}

linuxSizes.forEach(size => {
  const outputPath = path.join(linuxDir, `${size}x${size}.png`);
  try {
    execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${outputPath}"`);
    console.log(`  Created ${size}x${size}.png`);
  } catch (error) {
    console.error(`  Error creating ${size}x${size}.png:`, error.message);
  }
});
console.log('✓ Linux PNG files created in linux/ directory');
