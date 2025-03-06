// Game Constants
const GRID_SIZE = 10;
const BLOCK_COLORS = {
    I: '#00A5E5',    // Bright blue
    O1: '#FFB30F',   // Golden yellow
    O2: '#FF7F11',   // Orange
    O3: '#FF3F00',   // Vermillion
    T: '#C874D9',    // Orchid purple
    S: '#2ECC71',    // Emerald green
    Z: '#E74C3C',    // Crimson red
    J: '#3498DB',    // Ocean blue
    L: '#F39C12',    // Amber
    U: '#FF63B6',    // Pink
    L5: '#9B59B6',   // Amethyst purple
};
const TOUCH_MARGIN = 40; // Pixels above finger (additional margin)

// Base shapes without rotations
const BASE_SHAPES = {
    // Tetris shapes
    I: [[1, 1, 1, 1]],
    O2: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    // Additional shapes
    U: [[1, 0, 1], [1, 1, 1]],
    L5: [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
    O1: [[1]],
    O3: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
};

// Add these constants at the top of the file
const PIECE_WEIGHTS = {
    I: 1.0,    // Long piece, good for clearing
    O2: 1.0,   // 2x2 square, standard piece
    T: 1.0,    // T-shape, versatile
    S: 0.9,    // S-shape, slightly less common
    Z: 0.9,    // Z-shape, slightly less common
    J: 1.0,    // J-shape, standard piece
    L: 1.0,    // L-shape, standard piece
    U: 0.7,    // U-shape, more specialized
    L5: 0.8,   // L5-shape, more specialized
    O1: 0.3,   // 1x1, rare piece
    O3: 0.6    // 3x3, uncommon piece
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
        // Get DOM elements
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        
        // Create an overlay canvas for dragging pieces
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCtx = this.overlayCanvas.getContext('2d');
        
        // Style and position the overlay canvas to cover the entire viewport
        this.overlayCanvas.style.position = 'fixed';
        this.overlayCanvas.style.top = '0';
        this.overlayCanvas.style.left = '0';
        this.overlayCanvas.style.width = '100%';
        this.overlayCanvas.style.height = '100%';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.zIndex = '1000';
        document.body.appendChild(this.overlayCanvas);
        
        // Set overlay canvas dimensions to match window
        this.overlayCanvas.width = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
        
        // Handle resize events
        window.addEventListener('resize', () => {
            this.overlayCanvas.width = window.innerWidth;
            this.overlayCanvas.height = window.innerHeight;
            this.resizeOverlay();
        });
        
        // Get references to the next piece canvases
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
        
        // Remove all offset-related properties
        this.mouseOffset = 0;
        this.fingerOffset = 0;
        this.currentOffset = 0;
        
        // Add cursor style property
        this.canvas.style.cursor = 'pointer';
        
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
        
        // Initialize piece selection tracking
        this.pieceBag = [];
        this.pieceHistory = [];
        this.droughtTracking = new Map(Object.keys(PIECE_WEIGHTS).map(key => [key, 0]));
        
        // Bind event listeners
        this.bindEvents();
        
        // Start game
        this.initGame();
    }
    
    initGame() {
        // Reset game state
        this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
        this.score = 0;
        this.updateScore();
        
        // Reset piece selection tracking
        this.pieceBag = [];
        this.pieceHistory = [];
        this.droughtTracking = new Map(Object.keys(PIECE_WEIGHTS).map(key => [key, 0]));
        
        // Clear and regenerate next pieces
        this.nextPieces = [];
        this.generateNextPieces();
        
        // Redraw the board
        this.draw();
    }
    
    generateNextPieces() {
        while (this.nextPieces.length < 3) {
            this.nextPieces.push(this.getNextPiece());
        }
        this.drawNextPieces();
    }
    
    bindEvents() {
        // Touch events for the game board
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
        }, { passive: false });
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
        
        // Prevent all default touch behaviors on game elements
        const gameContainer = document.getElementById('game-container');
        gameContainer.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        }, { passive: false });
        
        gameContainer.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                e.preventDefault();
            }
        }, { passive: false });
        
        // New game button
        document.getElementById('new-game').addEventListener('click', () => this.initGame());
    }
    
    // A unified approach to handle all drag-related rendering and positioning
    startDragFromPiece(e, index, isTouch) {
        if (index >= this.nextPieces.length) return;
        
        this.selectedPieceIndex = index;
        this.selectedPiece = this.nextPieces[index];
        this.dragging = true;
        this.dragStartedFromPiece = true;
        
        // Store the original canvas for return animation
        this.dragStartCanvas = this.nextPieceCanvases[index];
        this.dragStartRect = this.dragStartCanvas.getBoundingClientRect();
        
        // Track if dragging with touch
        this.isDraggingWithTouch = isTouch;
        
        // Calculate dynamic offset based on piece height
        const pieceHeight = this.selectedPiece.shape.length;
        
        // For touch devices, calculate a more precise offset
        // For even-height pieces, add half a block to center more accurately
        if (isTouch) {
            // Base offset is half the piece height plus a fixed margin
            this.touchOffset = (pieceHeight * this.blockSize) / 2 + TOUCH_MARGIN;
            
            // Slight adjustment for even-height pieces to account for center offset
            if (pieceHeight % 2 === 0) {
                this.touchOffset += this.blockSize / 2;
            }
        } else {
            this.touchOffset = 0;
        }
        
        // Set the drag position directly to the current pointer position
        const boardRect = this.canvas.getBoundingClientRect();
        
        if (isTouch) {
            const touch = e.touches[0];
            this.dragX = touch.clientX;
            this.dragY = touch.clientY;
        } else {
            this.dragX = e.clientX;
            this.dragY = e.clientY;
        }
        
        // Calculate screen coordinates of the game board for placement calculation
        this.boardLeft = boardRect.left;
        this.boardTop = boardRect.top;
        this.boardRight = boardRect.right;
        this.boardBottom = boardRect.bottom;
        this.boardWidth = boardRect.width;
        this.boardHeight = boardRect.height;
        
        // Draw the piece and update game state
        this.updateDragState();
        this.drawNextPieces();
    }
    
    // A unified handler for all pointer movement
    updateDragPosition(clientX, clientY) {
        if (!this.dragging || !this.selectedPiece) return;
        
        // Update drag position
        this.dragX = clientX;
        this.dragY = clientY;
        
        // Update the drag state
        this.updateDragState();
    }
    
    // Process the current drag position and update game state
    updateDragState() {
        // Clear the overlay
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        // Apply dynamic touch offset to get the visual position
        let visualX = this.dragX;
        let visualY = this.dragY - (this.touchOffset || 0);
        
        // Check if the VISUAL position (after offset) is over the game board
        const isOverBoard = 
            visualX >= this.boardLeft && 
            visualX <= this.boardRight && 
            visualY >= this.boardTop && 
            visualY <= this.boardBottom;
        
        // Draw the game board
        this.draw();
        
        if (isOverBoard) {
            // Calculate grid position based on VISUAL position (including offset)
            const boardX = visualX - this.boardLeft;
            const boardY = visualY - this.boardTop;
            
            const shape = this.selectedPiece.shape;
            
            // Calculate the cell size
            const cellSize = this.boardWidth / GRID_SIZE;
            
            // For even-width/height pieces, we need to adjust the centering
            // since their true center falls between grid cells
            const width = shape[0].length;
            const height = shape.length;
            
            // Calculate the center point of the piece in visual coordinates
            const pieceCenterX = boardX;
            const pieceCenterY = boardY;
            
            // Calculate the top-left corner of the piece in grid coordinates
            // This approach aligns the visual center with the grid more precisely
            this.currentX = Math.round(pieceCenterX / cellSize - width / 2);
            this.currentY = Math.round(pieceCenterY / cellSize - height / 2);
            
            // Ensure placement is within bounds
            this.currentX = Math.max(0, Math.min(GRID_SIZE - width, this.currentX));
            this.currentY = Math.max(0, Math.min(GRID_SIZE - height, this.currentY));
            
            // Check if placement is valid and show indicator
            if (this.isValidPlacement(this.currentX, this.currentY, shape)) {
                this.drawValidPlacement(this.currentX, this.currentY);
            }
            
            // Hide cursor
            this.canvas.style.cursor = 'none';
        } else {
            // Reset placement position
            this.currentX = -1;
            this.currentY = -1;
            this.canvas.style.cursor = 'pointer';
        }
        
        // Draw the piece at the VISUAL position (which already includes the offset)
        this.drawDraggedPiece(visualX, visualY);
    }
    
    // Draw the dragged piece at the given screen coordinates
    drawDraggedPiece(x, y) {
        if (!this.selectedPiece) return;
        
        // Note: x,y are the visual positions with the touch offset already applied
        // in updateDragState - we use these directly without further adjustment
        
        const shape = this.selectedPiece.shape;
        const color = this.selectedPiece.color;
        
        // Calculate the dimensions of the piece on screen
        // Use the same scale as the game board
        const cellSize = this.boardWidth / GRID_SIZE;
        const pieceWidth = shape[0].length * cellSize;
        const pieceHeight = shape.length * cellSize;
        
        // Center the piece on the pointer with precise positioning
        // For even dimensions, this ensures true center alignment
        const left = x - pieceWidth / 2;
        const top = y - pieceHeight / 2;
        
        // Draw each block
        this.overlayCtx.globalAlpha = 0.9;
        
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const blockX = left + col * cellSize;
                    const blockY = top + row * cellSize;
                    
                    // Draw a block with 3D effect
                    const shrinkAmount = 4;
                    
                    // Main block
                    this.overlayCtx.fillStyle = color;
                    this.overlayCtx.fillRect(
                        blockX + shrinkAmount,
                        blockY + shrinkAmount,
                        cellSize - shrinkAmount * 2,
                        cellSize - shrinkAmount * 2
                    );
                    
                    // Top-left highlight
                    this.overlayCtx.fillStyle = this.lightenColor(color, 30);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(blockX + shrinkAmount, blockY + shrinkAmount);
                    this.overlayCtx.lineTo(blockX + cellSize - shrinkAmount, blockY + shrinkAmount);
                    this.overlayCtx.lineTo(blockX + shrinkAmount, blockY + cellSize - shrinkAmount);
                    this.overlayCtx.closePath();
                    this.overlayCtx.fill();
                    
                    // Bottom-right shadow
                    this.overlayCtx.fillStyle = this.darkenColor(color, 20);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(blockX + cellSize - shrinkAmount, blockY + shrinkAmount);
                    this.overlayCtx.lineTo(blockX + cellSize - shrinkAmount, blockY + cellSize - shrinkAmount);
                    this.overlayCtx.lineTo(blockX + shrinkAmount, blockY + cellSize - shrinkAmount);
                    this.overlayCtx.closePath();
                    this.overlayCtx.fill();
                }
            }
        }
        
        this.overlayCtx.globalAlpha = 1.0;
    }
    
    // Simplify all touch and mouse handlers to use the unified system
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.dragging || !this.selectedPiece) return;
        
        const touch = e.touches[0];
        this.updateDragPosition(touch.clientX, touch.clientY);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        if (this.dragging && this.selectedPiece) {
            this.endDrag();
        }
    }
    
    handleMouseMove(e) {
        if (!this.dragging || !this.selectedPiece) return;
        this.updateDragPosition(e.clientX, e.clientY);
    }
    
    handleMouseUp(e) {
        if (this.dragging && this.selectedPiece) {
            this.endDrag();
        }
    }
    
    endDrag() {
        if (!this.selectedPiece) return;
        
        // Restore cursor
        this.canvas.style.cursor = 'pointer';
        
        // Check if the piece is over the grid and in a valid position
        const isValid = this.currentX >= 0 && this.currentY >= 0 && 
                       this.isValidPlacement(this.currentX, this.currentY, this.selectedPiece.shape);
        
        if (isValid) {
            // Clear the overlay before placing
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
            
            // Place the piece at the grid position
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
            // Animate back to original position
            const startX = this.lastX + this.canvas.getBoundingClientRect().left;
            const startY = this.lastY + this.canvas.getBoundingClientRect().top;
            
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
        let clearedPositions = [];  // Store positions of cleared cells for effects
        
        // Check horizontal lines
        for (let y = 0; y < GRID_SIZE; y++) {
            if (this.grid[y].every(cell => cell !== 0)) {
                // Store the positions and colors before clearing
                for (let x = 0; x < GRID_SIZE; x++) {
                    clearedPositions.push({
                        x: x,
                        y: y,
                        color: this.grid[y][x]
                    });
                }
                // Clear the line
                for (let x = 0; x < GRID_SIZE; x++) {
                    this.grid[y][x] = 0;
                }
                linesCleared++;
            }
        }
        
        // Check vertical lines
        for (let x = 0; x < GRID_SIZE; x++) {
            if (this.grid.every(row => row[x] !== 0)) {
                // Store the positions and colors before clearing
                for (let y = 0; y < GRID_SIZE; y++) {
                    clearedPositions.push({
                        x: x,
                        y: y,
                        color: this.grid[y][x]
                    });
                }
                // Clear the line
                for (let y = 0; y < GRID_SIZE; y++) {
                    this.grid[y][x] = 0;
                }
                linesCleared++;
            }
        }
        
        // Create explosion effect if lines were cleared
        if (linesCleared > 0) {
            this.createClearEffect(clearedPositions, linesCleared);
            
            // Update score
            let points = 0;
            for (let i = 0; i < linesCleared; i++) {
                points += 10 * Math.pow(2, i);
            }
            this.score += points;
            this.updateScore();
        }
    }
    
    createClearEffect(positions, lineCount) {
        const particles = [];
        const particlesPerCell = 8 + (lineCount * 2); // More particles for more lines
        
        // Create particles for each cleared cell
        positions.forEach(pos => {
            for (let i = 0; i < particlesPerCell; i++) {
                particles.push({
                    x: (pos.x + 0.5) * this.blockSize,
                    y: (pos.y + 0.5) * this.blockSize,
                    color: pos.color,
                    size: Math.random() * 4 + 2,
                    speedX: (Math.random() - 0.5) * (6 + lineCount * 2),
                    speedY: (Math.random() - 0.5) * (6 + lineCount * 2),
                    life: 1.0,
                    rotation: Math.random() * Math.PI * 2
                });
            }
        });
        
        // Animation timing
        const startTime = performance.now();
        const duration = 600 + (lineCount * 100); // Longer animation for more lines
        
        // Animation function
        const animate = (currentTime) => {
            const progress = (currentTime - startTime) / duration;
            
            if (progress < 1) {
                // Clear canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw regular grid and blocks
                this.draw();
                
                // Draw particles
                particles.forEach(particle => {
                    // Update particle position
                    particle.x += particle.speedX;
                    particle.y += particle.speedY;
                    particle.rotation += 0.1;
                    particle.life = 1 - progress;
                    particle.size *= 0.99;
                    
                    // Draw particle
                    this.ctx.save();
                    this.ctx.translate(particle.x, particle.y);
                    this.ctx.rotate(particle.rotation);
                    this.ctx.globalAlpha = particle.life * 0.7;
                    
                    // Create gradient for particle
                    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
                    gradient.addColorStop(0, particle.color);
                    gradient.addColorStop(1, this.lightenColor(particle.color, 50));
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(-particle.size/2, -particle.size/2, 
                                    particle.size, particle.size);
                    
                    this.ctx.restore();
                });
                
                requestAnimationFrame(animate);
            } else {
                // Ensure final state is drawn correctly
                this.draw();
            }
        };
        
        // Start animation
        requestAnimationFrame(animate);
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
        // Create a subtle white glow effect
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 4;
        
        // Start a new path
        this.ctx.beginPath();
        
        const shape = this.selectedPiece.shape;
        
        // For each cell in the shape
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (shape[i][j]) {
                    // Check all four sides of this cell
                    // Top
                    if (!shape[i-1]?.[j]) {
                        this.ctx.moveTo((x + j) * this.blockSize, (y + i) * this.blockSize);
                        this.ctx.lineTo((x + j + 1) * this.blockSize, (y + i) * this.blockSize);
                    }
                    // Right
                    if (!shape[i][j+1]) {
                        this.ctx.moveTo((x + j + 1) * this.blockSize, (y + i) * this.blockSize);
                        this.ctx.lineTo((x + j + 1) * this.blockSize, (y + i + 1) * this.blockSize);
                    }
                    // Bottom
                    if (!shape[i+1]?.[j]) {
                        this.ctx.moveTo((x + j) * this.blockSize, (y + i + 1) * this.blockSize);
                        this.ctx.lineTo((x + j + 1) * this.blockSize, (y + i + 1) * this.blockSize);
                    }
                    // Left
                    if (!shape[i][j-1]) {
                        this.ctx.moveTo((x + j) * this.blockSize, (y + i) * this.blockSize);
                        this.ctx.lineTo((x + j) * this.blockSize, (y + i + 1) * this.blockSize);
                    }
                }
            }
        }
        
        // Stroke the entire path at once
        this.ctx.stroke();
        
        // Reset shadow effects
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.lineWidth = 1;
    }
    
    drawNextPieces() {
        // Calculate maximum possible shape dimensions
        const maxShapeDimensions = {
            width: Math.max(...Object.values(BASE_SHAPES).map(shape => shape[0].length)),
            height: Math.max(...Object.values(BASE_SHAPES).map(shape => shape.length))
        };
        
        this.nextPieces.forEach((piece, index) => {
            const canvas = this.nextPieceCanvases[index];
            const ctx = canvas.getContext('2d');
            
            // Set canvas size with padding for largest possible shape
            const blockSize = 15;
            const padding = blockSize; // One block worth of padding on each side
            canvas.width = (maxShapeDimensions.width * blockSize) + (padding * 2);
            canvas.height = (maxShapeDimensions.height * blockSize) + (padding * 2);
            
            // Clear canvas with transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw rounded border
            ctx.strokeStyle = this.selectedPieceIndex === index ? '#4CAF50' : '#ddd';
            ctx.lineWidth = this.selectedPieceIndex === index ? 3 : 2;
            ctx.beginPath();
            const radius = 10;
            ctx.roundRect(1, 1, canvas.width - 2, canvas.height - 2, radius);
            ctx.stroke();
            
            // Skip rest of drawing if piece is being dragged
            if (this.selectedPieceIndex === index && this.dragging) {
                return;
            }
            
            // Center the piece
            const pieceWidth = piece.shape[0].length * blockSize;
            const pieceHeight = piece.shape.length * blockSize;
            const offsetX = (canvas.width - pieceWidth) / 2;
            const offsetY = (canvas.height - pieceHeight) / 2;
            
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
        this.drawDraggedPiece(currentX, currentY);
        
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
    
    refillBag() {
        // Create a new bag with multiple copies of each piece based on weights
        const newBag = [];
        Object.entries(PIECE_WEIGHTS).forEach(([key, weight]) => {
            // Convert weight to number of copies (1.0 = 4 copies, 0.3 = 1 copy, etc.)
            const copies = Math.max(1, Math.round(weight * 4));
            for (let i = 0; i < copies; i++) {
                newBag.push(key);
            }
        });
        
        // Shuffle the bag
        for (let i = newBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
        }
        
        this.pieceBag = newBag;
    }
    
    updateDroughtTracking(selectedKey) {
        // Increment drought counters for all pieces
        this.droughtTracking.forEach((value, key) => {
            if (key === selectedKey) {
                this.droughtTracking.set(key, 0); // Reset counter for selected piece
            } else {
                this.droughtTracking.set(key, value + 1); // Increment counter for others
            }
        });
    }
    
    getNextPiece() {
        // If bag is empty, refill it
        if (this.pieceBag.length === 0) {
            this.refillBag();
        }
        
        // Calculate drought modifiers
        const droughtModifiers = new Map();
        this.droughtTracking.forEach((drought, key) => {
            // Start boosting probability after 8 pieces without seeing this type
            const boost = Math.max(0, (drought - 8) * 0.15);
            droughtModifiers.set(key, 1 + boost);
        });
        
        // Get current piece types in hand
        const currentTypes = this.nextPieces.map(piece => 
            Object.keys(SHAPES).find(key => 
                JSON.stringify(SHAPES[key][0]) === JSON.stringify(piece.shape)
            )
        );
        
        // Select pieces with modified weights
        let selectedKey;
        const maxAttempts = 3; // Try a few times to get a good piece
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Get a random piece from the bag
            const bagIndex = Math.floor(Math.random() * this.pieceBag.length);
            const candidateKey = this.pieceBag[bagIndex];
            
            // Calculate final weight based on duplicates and drought
            const duplicateCount = currentTypes.filter(t => t === candidateKey).length;
            const droughtModifier = droughtModifiers.get(candidateKey) || 1;
            const finalWeight = PIECE_WEIGHTS[candidateKey] * 
                              Math.pow(0.4, duplicateCount) * 
                              droughtModifier;
            
            // Accept piece if it's the last attempt or passes probability check
            if (attempt === maxAttempts - 1 || Math.random() < finalWeight) {
                selectedKey = candidateKey;
                this.pieceBag.splice(bagIndex, 1);
                break;
            }
        }
        
        // Update tracking
        this.updateDroughtTracking(selectedKey);
        this.pieceHistory.push(selectedKey);
        if (this.pieceHistory.length > 20) {
            this.pieceHistory.shift();
        }
        
        // Get random rotation and return piece
        const rotations = SHAPES[selectedKey];
        const randomRotation = rotations[Math.floor(Math.random() * rotations.length)];
        
        return {
            shape: randomRotation,
            color: BLOCK_COLORS[selectedKey]
        };
    }
    
    // Update the piece drag handler
    handlePieceDragMove(e) {
        if (!this.dragging || !this.selectedPiece) return;
        
        if (e.type.startsWith('touch')) {
            const touch = e.touches[0];
            this.updateDragPosition(touch.clientX, touch.clientY);
        } else {
            this.updateDragPosition(e.clientX, e.clientY);
        }
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
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 