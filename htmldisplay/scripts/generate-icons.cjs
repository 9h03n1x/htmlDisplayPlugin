const { Jimp } = require('jimp');
const path = require('path');

const BASE_PATH = path.join(__dirname, '../com.nicco-hagedorn.htmldisplay.sdPlugin/imgs');

async function createIcon(name, width, height, text, color, bgColor) {
    const image = new Jimp({ width: width, height: height, color: bgColor });
    
    // Simple pixel art or shapes since loading fonts in pure JS without external files is tricky in JIMP 
    // (it needs a .fnt file).
    // We will draw simple rectangles/shapes to represent the icons.

    // Draw a border
    const border = Math.max(1, Math.floor(width * 0.05));
    for(let x=0; x<width; x++) {
        for(let y=0; y<height; y++) {
            if (x < border || x >= width - border || y < border || y >= height - border) {
                image.setPixelColor(color, x, y);
            }
        }
    }

    // Draw a symbol based on text
    const cx = width / 2;
    const cy = height / 2;
    const size = width * 0.5;
    const half = size / 2;

    if (text === '< >') {
        // Draw <
        for(let i=0; i<half; i++) {
            image.setPixelColor(color, Math.floor(cx - half + i), Math.floor(cy - i));
            image.setPixelColor(color, Math.floor(cx - half + i), Math.floor(cy + i));
        }
        // Draw >
        for(let i=0; i<half; i++) {
            image.setPixelColor(color, Math.floor(cx + half - i), Math.floor(cy - i));
            image.setPixelColor(color, Math.floor(cx + half - i), Math.floor(cy + i));
        }
    } else if (text === 'HTML') {
        // Draw a simple box
        for(let x=Math.floor(cx-half); x<Math.floor(cx+half); x++) {
            for(let y=Math.floor(cy-half); y<Math.floor(cy+half); y++) {
                image.setPixelColor(color, x, y);
            }
        }
    }

    const filePath = path.join(BASE_PATH, name);
    await image.write(filePath);
    console.log(`Created ${filePath}`);
}

async function main() {
    const blue = 0x007ACCFF; // VS Code Blue
    const white = 0xFFFFFFFF;
    const dark = 0x1E1E1EFF;

    // Action Icons (List) - Blue on Transparent/Dark
    await createIcon('actions/show/icon.png', 20, 20, '< >', blue, 0x00000000);
    await createIcon('actions/show/icon@2x.png', 40, 40, '< >', blue, 0x00000000);

    // Key Images (The button itself) - Dark background, Blue text
    await createIcon('actions/show/key.png', 72, 72, '< >', white, dark);
    await createIcon('actions/show/key@2x.png', 144, 144, '< >', white, dark);

    // Category Icon - White on Transparent
    await createIcon('plugin/category-icon.png', 28, 28, 'HTML', white, 0x00000000);
    await createIcon('plugin/category-icon@2x.png', 56, 56, 'HTML', white, 0x00000000);

    // Plugin Icon (Marketplace) - Big, Blue background
    await createIcon('plugin/marketplace.png', 288, 288, 'HTML', white, blue);
}

main().catch(console.error);
