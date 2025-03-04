const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, size, size);
    
    // Draw a simple block pattern
    const blockSize = size / 4;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if ((i + j) % 2 === 0) {
                ctx.fillRect(i * blockSize, j * blockSize, blockSize, blockSize);
            }
        }
    }
    
    return canvas.toBuffer('image/png');
}

// Generate icons
const sizes = [192, 512];
sizes.forEach(size => {
    const buffer = generateIcon(size);
    fs.writeFileSync(`assets/icon-${size}.png`, buffer);
    console.log(`Generated ${size}x${size} icon`);
}); 