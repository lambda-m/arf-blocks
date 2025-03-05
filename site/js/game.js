// Game Constants
const GRID_SIZE = 10;
const BLOCK_COLORS = {
    I: '#00BFFF', // Deep sky blue
    O: '#FFD700', // Gold yellow
    T: '#9932CC', // Dark orchid purple
    S: '#32CD32', // Lime green
    Z: '#FF4500', // Orange red
    J: '#4169E1', // Royal blue
    L: '#FF8C00', // Dark orange
    // Additional shapes
    U: '#FF1493', // Deep pink
    L5: '#8A2BE2', // Blue violet
    Z5: '#20B2AA'  // Light sea green
};

// Base shapes without rotations
const BASE_SHAPES = {
    // Tetris shapes
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    // Additional shapes
    U: [[1, 0, 1], [1, 1, 1]],
    L5: [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
    Z5: [[1, 1, 0, 0], [0, 1, 1, 1]]
};

// Function to rotate a shape 90 degrees clockwise
function rotateShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            rotated[c][rows - 1 - r] = shape[r][c];
        }
    }
    
    return rotated;
}

// Generate all rotations for each shape
function generateAllRotations(baseShapes) {
    const allShapes = {};
    
    for (const [key, shape] of Object.entries(baseShapes)) {
        const rotations = new Set(); // Use Set to avoid duplicate rotations
        let currentRotation = shape;
        
        // Generate all 4 rotations
        for (let i = 0; i < 4; i++) {
            // Convert the shape to a string for comparison
            const rotationKey = JSON.stringify(currentRotation);
            rotations.add(rotationKey);
            currentRotation = rotateShape(currentRotation);
        }
        
        // Convert back to arrays and store unique rotations
        allShapes[key] = Array.from(rotations).map(r => JSON.parse(r));
    }
    
    return allShapes;
}

// Generate all possible rotations
const SHAPES = generateAllRotations(BASE_SHAPES);

class Game {
    constructor() {
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        
        // Create overlay canvas for dragging
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.style.position = 'fixed';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.zIndex = '1000';
        document.body.appendChild(this.overlayCanvas);
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        // Set overlay canvas size to window size
        this.resizeOverlay();
        window.addEventListener('resize', () => this.resizeOverlay());
        
        this.nextPieceCanvases = [
            document.getElementById('piece-1'),
            document.getElementById('piece-2'),
            document.getElementById('piece-3')
        ];
        
        // Set canvas size based on screen width
        const screenWidth = window.innerWidth;
        const canvasSize = Math.min(screenWidth * 0.8, 400);
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        this.blockSize = canvasSize / GRID_SIZE;
        
        // Initialize game state
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        this.score = 0;
        this.nextPieces = [];
        this.selectedPiece = null;
        this.selectedPieceIndex = null;
        this.dragging = false;
        this.dragStartedFromPiece = false;
        this.currentX = 0;
        this.currentY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.touchOffsetX = 0;
        this.touchOffsetY = 0;
        
        // Different offsets for touch vs mouse
        this.fingerOffset = -100; // Increased offset for even better visibility above finger
        this.mouseOffset = 0;    // No offset for mouse
        this.currentOffset = 0;  // Will be set based on input type
        
        // Device detection
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Animation properties
        this.animating = false;
        this.animationStartTime = null;
        this.animationDuration = 300; // ms
        this.animationStartPos = null;
        this.animationEndPos = null;
        this.animationPiece = null;
        this.animationCallback = null;
        
        // Original position of the piece being dragged
        this.dragStartCanvas = null;
        this.dragStartRect = null;
        
        // Bind event listeners
        this.bindEvents();
        
        // Start game
        this.initGame();
    }
    
    initGame() {
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        this.score = 0;
        this.updateScore();
        this.generateNextPieces();
        this.draw();
    }
    
    generateNextPieces() {
        const shapeKeys = Object.keys(SHAPES);
        while (this.nextPieces.length < 3) {
            const shapeKey = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
            // Get all possible rotations for this shape
            const rotations = SHAPES[shapeKey];
            // Pick a random rotation
            const randomRotation = rotations[Math.floor(Math.random() * rotations.length)];
            
            this.nextPieces.push({
                shape: randomRotation,
                color: BLOCK_COLORS[shapeKey]
            });
        }
        this.drawNextPieces();
    }
    
    bindEvents() {
        // Touch events for the game board
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse events for the game board
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Next piece selection - direct drag events
        this.nextPieceCanvases.forEach((canvas, index) => {
            // Touch events
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startDragFromPiece(e, index, true);
                
                // Immediately allow movement to continue onto the game board
                document.addEventListener('touchmove', this.handlePieceDragMove.bind(this), { passive: false, once: false });
                document.addEventListener('touchend', this.handlePieceDragEnd.bind(this), { passive: false, once: true });
            }, { passive: false });
            
            // Mouse events
            canvas.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startDragFromPiece(e, index, false);
                
                // Immediately allow movement to continue onto the game board
                document.addEventListener('mousemove', this.handlePieceDragMove.bind(this), { once: false });
                document.addEventListener('mouseup', this.handlePieceDragEnd.bind(this), { once: true });
            });
        });
        
        // Prevent all default touch behaviors
        document.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        }, { passive: false });
        
        // New game button
        document.getElementById('new-game').addEventListener('click', () => this.initGame());
    }
    
    startDragFromPiece(e, index, isTouch) {
        if (index >= this.nextPieces.length) return;
        
        this.selectedPieceIndex = index;
        this.selectedPiece = this.nextPieces[index];
        this.dragging = true;
        this.dragStartedFromPiece = true;
        
        // Store the original canvas and its position for return animation
        this.dragStartCanvas = this.nextPieceCanvases[index];
        this.dragStartRect = this.dragStartCanvas.getBoundingClientRect();
        
        // Set the appropriate offset for touch or mouse
        this.currentOffset = isTouch ? this.fingerOffset : this.mouseOffset;
        
        // Calculate initial position
        let x, y;
        if (isTouch) {
            const touch = e.touches[0];
            const boardRect = this.canvas.getBoundingClientRect();
            x = touch.clientX - boardRect.left;
            y = touch.clientY - boardRect.top;
            
            // Calculate touch point relative to the piece center
            const pieceWidth = this.selectedPiece.shape[0].length * this.blockSize;
            const pieceHeight = this.selectedPiece.shape.length * this.blockSize;
            this.touchOffsetX = pieceWidth / 2;
            this.touchOffsetY = pieceHeight / 2;
        } else {
            const boardRect = this.canvas.getBoundingClientRect();
            x = e.clientX - boardRect.left;
            y = e.clientY - boardRect.top;
            
            // Calculate mouse point relative to the piece center
            const pieceWidth = this.selectedPiece.shape[0].length * this.blockSize;
            const pieceHeight = this.selectedPiece.shape.length * this.blockSize;
            this.touchOffsetX = pieceWidth / 2;
            this.touchOffsetY = pieceHeight / 2;
        }
        
        // Start dragging from the original piece position
        const startRect = this.dragStartRect;
        const boardRect = this.canvas.getBoundingClientRect();
        this.lastX = startRect.left - boardRect.left + startRect.width / 2;
        this.lastY = startRect.top - boardRect.top + startRect.height / 2;
        
        // Update position and clear original piece
        this.updateDragPosition(x, y);
        this.drawNextPieces();
    }
    
    handlePieceDragMove(e) {
        if (!this.dragging || !this.selectedPiece) return;
        
        const boardRect = this.canvas.getBoundingClientRect();
        let x, y;
        
        if (e.type.startsWith('touch')) {
            const touch = e.touches[0];
            x = touch.clientX - boardRect.left;
            y = touch.clientY - boardRect.top;
        } else {
            x = e.clientX - boardRect.left;
            y = e.clientY - boardRect.top;
        }
        
        this.updateDragPosition(x, y);
    }
    
    handlePieceDragEnd(e) {
        if (this.dragging && this.selectedPiece) {
            this.endDrag();
        }
        
        // Remove the temporary document-level listeners
        document.removeEventListener('touchmove', this.handlePieceDragMove.bind(this));
        document.removeEventListener('touchend', this.handlePieceDragEnd.bind(this));
        document.removeEventListener('mousemove', this.handlePieceDragMove.bind(this));
        document.removeEventListener('mouseup', this.handlePieceDragEnd.bind(this));
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.dragging || !this.selectedPiece) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.updateDragPosition(x, y);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (this.dragging && this.selectedPiece) {
            this.endDrag();
        }
    }
    
    handleMouseMove(e) {
        if (!this.dragging || !this.selectedPiece) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.updateDragPosition(x, y);
    }
    
    handleMouseUp(e) {
        if (this.dragging && this.selectedPiece) {
            this.endDrag();
        }
    }
    
    updateDragPosition(x, y) {
        // Store the actual mouse/touch position for free-form dragging
        this.lastX = x;
        this.lastY = y;
        
        // Apply the finger offset for touch devices
        if (this.isTouchDevice) {
            y += this.fingerOffset;
        }
        
        // Clear overlay canvas
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        // Draw the dragged piece on the overlay at actual position
        const screenX = x + this.canvas.getBoundingClientRect().left;
        const screenY = y + this.canvas.getBoundingClientRect().top;
        const pieceX = (x - this.touchOffsetX) / this.blockSize;
        const pieceY = (y - this.touchOffsetY) / this.blockSize;
        
        // Check if the piece is over the grid
        const boardRect = this.canvas.getBoundingClientRect();
        const isOverGrid = x >= 0 && x < boardRect.width && y >= 0 && y < boardRect.height;
        
        if (isOverGrid) {
            // Calculate grid position only when over the grid
            const gridX = Math.floor(pieceX);
            const gridY = Math.floor(pieceY);
            
            // Update current grid position for placement
            this.currentX = gridX;
            this.currentY = gridY;
            
            // Update game board display
            this.draw();
            
            // Draw placement preview if over a valid position
            if (this.isValidPlacement(gridX, gridY, this.selectedPiece.shape)) {
                this.drawValidPlacement(gridX, gridY);
            }
        } else {
            // When not over grid, set invalid position and just draw the board
            this.currentX = -1;
            this.currentY = -1;
            this.draw();
        }
        
        // Always draw the dragged piece
        this.drawDraggedPiece(screenX - this.touchOffsetX, screenY - this.touchOffsetY);
    }
    
    drawDraggedPiece(x, y) {
        if (!this.selectedPiece) return;
        
        const scaleFactor = this.blockSize / 15;
        const blockSize = 15 * scaleFactor;
        
        this.overlayCtx.globalAlpha = 1; // Full opacity for dragged piece
        
        const shape = this.selectedPiece.shape;
        const color = this.selectedPiece.color;
        
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j]) {
                    // Main block
                    this.overlayCtx.fillStyle = color;
                    this.overlayCtx.fillRect(
                        x + j * blockSize,
                        y + i * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                    
                    // Highlight (top-left)
                    this.overlayCtx.fillStyle = this.lightenColor(color, 30);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(x + j * blockSize, y + i * blockSize);
                    this.overlayCtx.lineTo(x + (j + 1) * blockSize - 1, y + i * blockSize);
                    this.overlayCtx.lineTo(x + j * blockSize, y + (i + 1) * blockSize - 1);
                    this.overlayCtx.closePath();
                    this.overlayCtx.fill();
                    
                    // Shadow (bottom-right)
                    this.overlayCtx.fillStyle = this.darkenColor(color, 20);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(x + (j + 1) * blockSize - 1, y + i * blockSize);
                    this.overlayCtx.lineTo(x + (j + 1) * blockSize - 1, y + (i + 1) * blockSize - 1);
                    this.overlayCtx.lineTo(x + j * blockSize, y + (i + 1) * blockSize - 1);
                    this.overlayCtx.closePath();
                    this.overlayCtx.fill();
                }
            }
        }
    }
    
    endDrag() {
        if (!this.selectedPiece) return;
        
        // Check if the piece is over the grid and in a valid position
        const isValid = this.currentX >= 0 && this.currentY >= 0 && 
                       this.isValidPlacement(this.currentX, this.currentY, this.selectedPiece.shape);
        
        if (isValid) {
            // Clear the overlay before placing
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
            
            // Snap to grid position for placement
            this.placePiece(this.currentX, this.currentY, this.selectedPiece.shape, this.selectedPiece.color);
            
            const blockCount = this.countBlocksInShape(this.selectedPiece.shape);
            this.score += blockCount;
            this.updateScore();
            
            // Remove the used piece and generate a new one
            if (this.selectedPieceIndex !== null) {
                this.nextPieces.splice(this.selectedPieceIndex, 1);
                this.generateNextPieces();
            }
            
            this.checkLines();
            
            if (!this.hasValidMoves()) {
                alert('Game Over! Your score: ' + this.score);
                this.initGame();
                return;
            }
        } else {
            // Always animate back to original position if not valid or outside grid
            const startX = this.lastX + this.canvas.getBoundingClientRect().left;
            const startY = (this.lastY + this.canvas.getBoundingClientRect().top) + 
                          (this.isTouchDevice ? this.fingerOffset : 0);
            
            // Animate back to original position
            this.startAnimation(
                startX, startY,
                this.dragStartRect.left + this.dragStartRect.width / 2,
                this.dragStartRect.top + this.dragStartRect.height / 2,
                this.selectedPiece,
                () => {
                    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
                    this.dragging = false;
                    this.dragStartedFromPiece = false;
                    this.selectedPiece = null;
                    this.selectedPieceIndex = null;
                    this.draw();
                    this.drawNextPieces();
                }
            );
            return;
        }
        
        // Reset states
        this.dragging = false;
        this.dragStartedFromPiece = false;
        this.selectedPiece = null;
        this.selectedPieceIndex = null;
        this.draw();
        this.drawNextPieces();
    }
    
    countBlocksInShape(shape) {
        // Count the number of blocks (1s) in a shape
        return shape.flat().filter(cell => cell === 1).length;
    }
    
    hasValidMoves() {
        // Check if any piece can be placed on the grid
        for (let piece of this.nextPieces) {
            const shape = piece.shape;
            
            // Try each position on the grid
            for (let y = 0; y <= GRID_SIZE - shape.length; y++) {
                for (let x = 0; x <= GRID_SIZE - shape[0].length; x++) {
                    if (this.isValidPlacement(x, y, shape)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    isValidPlacement(x, y, shape) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j]) {
                    const newX = x + j;
                    const newY = y + i;
                    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE || this.grid[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    placePiece(x, y, shape, color) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j]) {
                    this.grid[y + i][x + j] = color;
                }
            }
        }
    }
    
    checkLines() {
        let linesCleared = 0;
        
        // Check horizontal lines
        for (let y = 0; y < GRID_SIZE; y++) {
            if (this.grid[y].every(cell => cell !== 0)) {
                // Just clear the line without shifting anything
                for (let x = 0; x < GRID_SIZE; x++) {
                    this.grid[y][x] = 0;
                }
                linesCleared++;
            }
        }
        
        // Check vertical lines
        for (let x = 0; x < GRID_SIZE; x++) {
            if (this.grid.every(row => row[x] !== 0)) {
                for (let y = 0; y < GRID_SIZE; y++) {
                    this.grid[y][x] = 0;
                }
                linesCleared++;
            }
        }
        
        // Update score based on lines cleared
        if (linesCleared > 0) {
            let points = 0;
            for (let i = 0; i < linesCleared; i++) {
                points += 10 * Math.pow(2, i);
            }
            this.score += points;
            this.updateScore();
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid lines
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= GRID_SIZE; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.blockSize, 0);
            this.ctx.lineTo(x * this.blockSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= GRID_SIZE; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.blockSize);
            this.ctx.lineTo(this.canvas.width, y * this.blockSize);
            this.ctx.stroke();
        }
        
        // Draw placed blocks
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                if (this.grid[y][x]) {
                    this.ctx.fillStyle = this.grid[y][x];
                    
                    // Draw block with subtle 3D effect
                    this.drawBlock(x, y, this.grid[y][x]);
                }
            }
        }
    }
    
    drawBlock(x, y, color, isPreview = false) {
        // Main block
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
            x * this.blockSize + 1, 
            y * this.blockSize + 1, 
            this.blockSize - 2, 
            this.blockSize - 2
        );
        
        if (!isPreview) {
            // Highlight (top-left)
            this.ctx.fillStyle = this.lightenColor(color, 30);
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.blockSize + 1, y * this.blockSize + 1);
            this.ctx.lineTo((x + 1) * this.blockSize - 1, y * this.blockSize + 1);
            this.ctx.lineTo(x * this.blockSize + 1, (y + 1) * this.blockSize - 1);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Shadow (bottom-right)
            this.ctx.fillStyle = this.darkenColor(color, 20);
            this.ctx.beginPath();
            this.ctx.moveTo((x + 1) * this.blockSize - 1, y * this.blockSize + 1);
            this.ctx.lineTo((x + 1) * this.blockSize - 1, (y + 1) * this.blockSize - 1);
            this.ctx.lineTo(x * this.blockSize + 1, (y + 1) * this.blockSize - 1);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }
    
    drawPiece(x, y, shape, color, isPreview = false) {
        // Different rendering for preview vs placed pieces
        if (isPreview) {
            // Both the preview and the placement indicator are now in the same position
            // We don't need the additional offset since it's already in the gridY position
            
            if (this.isTouchDevice) {
                // Semi-transparent for touch preview
                this.ctx.globalAlpha = 0.8;
            } else {
                // Fully opaque for mouse
                this.ctx.globalAlpha = 1;
            }
            
            for (let i = 0; i < shape.length; i++) {
                for (let j = 0; j < shape[i].length; j++) {
                    if (shape[i][j]) {
                        // Draw preview blocks
                        this.drawBlock(x + j, y + i, color, true);
                    }
                }
            }
            
            // Reset transparency
            this.ctx.globalAlpha = 1;
        } else {
            // Regular placed blocks
            for (let i = 0; i < shape.length; i++) {
                for (let j = 0; j < shape[i].length; j++) {
                    if (shape[i][j]) {
                        this.drawBlock(x + j, y + i, color);
                    }
                }
            }
        }
    }
    
    drawValidPlacement(x, y) {
        // Draw a subtle highlight to show where the piece will be placed
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.15)'; // Even more transparent
        for (let i = 0; i < this.selectedPiece.shape.length; i++) {
            for (let j = 0; j < this.selectedPiece.shape[i].length; j++) {
                if (this.selectedPiece.shape[i][j]) {
                    this.ctx.fillRect(
                        (x + j) * this.blockSize + 1,
                        (y + i) * this.blockSize + 1,
                        this.blockSize - 2,
                        this.blockSize - 2
                    );
                }
            }
        }
    }
    
    drawNextPieces() {
        this.nextPieces.forEach((piece, index) => {
            // Skip drawing the piece that's being dragged
            if (this.selectedPieceIndex === index && this.dragging) {
                const canvas = this.nextPieceCanvases[index];
                const ctx = canvas.getContext('2d');
                
                // Clear the canvas
                canvas.width = 90;
                canvas.height = 60;
                
                // Draw background
                ctx.fillStyle = '#f8f8f8';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw border
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
                return;
            }
            
            const canvas = this.nextPieceCanvases[index];
            const ctx = canvas.getContext('2d');
            
            // Set canvas size appropriate for the blocks
            canvas.width = 90; 
            canvas.height = 60;
            
            const blockSize = 15;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw border
            ctx.strokeStyle = this.selectedPieceIndex === index ? '#4CAF50' : '#ddd';
            ctx.lineWidth = this.selectedPieceIndex === index ? 3 : 1;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
            
            // Center the piece
            const offsetX = (canvas.width - piece.shape[0].length * blockSize) / 2;
            const offsetY = (canvas.height - piece.shape.length * blockSize) / 2;
            
            // Draw piece with 3D effect
            const color = piece.color;
            for (let i = 0; i < piece.shape.length; i++) {
                for (let j = 0; j < piece.shape[i].length; j++) {
                    if (piece.shape[i][j]) {
                        // Main block
                        ctx.fillStyle = color;
                        ctx.fillRect(
                            offsetX + j * blockSize,
                            offsetY + i * blockSize,
                            blockSize - 1,
                            blockSize - 1
                        );
                        
                        // Highlight (top-left)
                        ctx.fillStyle = this.lightenColor(color, 30);
                        ctx.beginPath();
                        ctx.moveTo(offsetX + j * blockSize, offsetY + i * blockSize);
                        ctx.lineTo(offsetX + (j + 1) * blockSize - 1, offsetY + i * blockSize);
                        ctx.lineTo(offsetX + j * blockSize, offsetY + (i + 1) * blockSize - 1);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Shadow (bottom-right)
                        ctx.fillStyle = this.darkenColor(color, 20);
                        ctx.beginPath();
                        ctx.moveTo(offsetX + (j + 1) * blockSize - 1, offsetY + i * blockSize);
                        ctx.lineTo(offsetX + (j + 1) * blockSize - 1, offsetY + (i + 1) * blockSize - 1);
                        ctx.lineTo(offsetX + j * blockSize, offsetY + (i + 1) * blockSize - 1);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
        });
    }
    
    startAnimation(startX, startY, endX, endY, piece, callback) {
        this.animating = true;
        this.animationStartTime = performance.now();
        this.animationStartPos = { x: startX, y: startY };
        this.animationEndPos = { x: endX, y: endY };
        this.animationPiece = piece;
        this.animationCallback = callback;
        
        // Start the animation loop
        this.animate();
    }
    
    animate(currentTime) {
        if (!this.animating) return;
        
        if (!this.animationStartTime) this.animationStartTime = currentTime;
        const progress = Math.min(1, (currentTime - this.animationStartTime) / this.animationDuration);
        
        // Easing function for smooth animation
        const easeProgress = this.easeOutBack(progress);
        
        // Calculate current position
        const currentX = this.animationStartPos.x + (this.animationEndPos.x - this.animationStartPos.x) * easeProgress;
        const currentY = this.animationStartPos.y + (this.animationEndPos.y - this.animationStartPos.y) * easeProgress;
        
        // Clear and redraw the game board
        this.draw();
        
        // Clear overlay canvas
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        // Draw the animating piece on the overlay
        this.drawDraggedPiece(currentX - this.touchOffsetX, currentY - this.touchOffsetY);
        
        if (progress < 1) {
            // Continue animation
            requestAnimationFrame(this.animate.bind(this));
        } else {
            // Animation complete
            this.animating = false;
            this.animationStartTime = null;
            if (this.animationCallback) {
                this.animationCallback();
            }
        }
    }
    
    easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    
    resizeOverlay() {
        this.overlayCanvas.width = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 