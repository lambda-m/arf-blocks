// Game Constants
const GRID_SIZE = 10;
const BLOCK_COLORS = {
    I: '#00A5E5',    // Bright blue (4-block)
    I2: '#63C5DA',   // Sky blue (2-block)
    I3: '#4682B4',   // Steel blue (3-block)
    O1: '#FFB30F',   // Golden yellow
    O2: '#FF7F11',   // Orange
    O3: '#FF3F00',   // Vermillion
    T: '#C874D9',    // Orchid purple
    S: '#2ECC71',    // Emerald green
    Z: '#E74C3C',    // Crimson red
    J: '#3498DB',    // Ocean blue
    L: '#F39C12',    // Amber
    L3: '#D35400',   // Burnt orange (new 3-block L shape)
    U: '#FF63B6',    // Pink
    L5: '#9B59B6',   // Amethyst purple
};
const TOUCH_MARGIN = 40; // Pixels above finger (additional margin)

// Base shapes without rotations
const BASE_SHAPES = {
    // Tetris shapes
    I: [[1, 1, 1, 1]],       // Classic 4-block line
    I2: [[1, 1]],            // 2-block line
    I3: [[1, 1, 1]],         // 3-block line
    O2: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    // Additional shapes
    L3: [[1, 0], [1, 1]],    // 3-block L shape
    U: [[1, 0, 1], [1, 1, 1]],
    L5: [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
    O1: [[1]],
    O3: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
};

// Add these constants at the top of the file
const PIECE_WEIGHTS = {
    I: 1.0,    // Long piece, good for clearing
    I2: 1.0,   // Short line, easy to place
    I3: 1.0,   // Medium line, versatile
    O2: 1.0,   // 2x2 square, standard piece
    T: 1.0,    // T-shape, versatile
    S: 0.9,    // S-shape, slightly less common
    Z: 0.9,    // Z-shape, slightly less common
    J: 1.0,    // J-shape, standard piece
    L: 1.0,    // L-shape, standard piece
    L3: 0.9,   // 3-block L shape, slightly less common
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
        
        // Create game over overlay container
        this.gameOverOverlay = document.createElement('div');
        this.gameOverOverlay.className = 'game-over-overlay';
        this.gameOverOverlay.style.display = 'none';
        document.getElementById('game-container').appendChild(this.gameOverOverlay);
        
        // Create game over content
        this.gameOverContent = document.createElement('div');
        this.gameOverContent.className = 'game-over-content';
        this.gameOverOverlay.appendChild(this.gameOverContent);
        
        // Load high score from local storage
        this.highScore = parseInt(localStorage.getItem('blockGameHighScore')) || 0;
        
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
        
        // Pre-bind document-level handlers so add/remove use the same references
        this._onDocTouchMove = this.handlePieceDragMove.bind(this);
        this._onDocTouchEnd = this.handlePieceDragEnd.bind(this);
        this._onDocMouseMove = this.handlePieceDragMove.bind(this);
        this._onDocMouseUp = this.handlePieceDragEnd.bind(this);

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
        
        // Calculate the largest shape dimension to ensure all shapes fit
        const maxDimension = Math.max(
            ...Object.values(BASE_SHAPES).map(shape => shape.length),
            ...Object.values(BASE_SHAPES).map(shape => shape[0].length)
        );
        
        // Make sure all canvases are properly sized and cleared
        this.nextPieceCanvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            // More compact size that still fits all shapes
            canvas.width = 80;
            canvas.height = 80;
            
            // Clear canvas with transparency
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        
        // Force a complete redraw of all pieces
        this.drawNextPieces();
        
        // Redraw the board
        this.draw();
        
        // Update high score display if it exists
        const highScoreElement = document.getElementById('high-score');
        if (highScoreElement) {
            highScoreElement.textContent = this.highScore;
        }
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
                document.addEventListener('touchmove', this._onDocTouchMove, { passive: false });
                document.addEventListener('touchend', this._onDocTouchEnd, { passive: false, once: true });
            }, { passive: false });
            
            // Mouse events
            canvas.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.startDragFromPiece(e, index, false);
                
                // Immediately allow movement to continue onto the game board
                document.addEventListener('mousemove', this._onDocMouseMove);
                document.addEventListener('mouseup', this._onDocMouseUp, { once: true });
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
                    
                    // Size of the bevel (edge)
                    const bevelSize = Math.max(3, Math.floor(cellSize * 0.15));
                    
                    // Main face (center square)
                    this.overlayCtx.fillStyle = color;
                    this.overlayCtx.fillRect(
                        blockX + bevelSize, 
                        blockY + bevelSize, 
                        cellSize - bevelSize * 2, 
                        cellSize - bevelSize * 2
                    );
                    
                    // Top bevel (lighter)
                    this.overlayCtx.fillStyle = this.lightenColor(color, 30);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(blockX, blockY);                           // Top-left outer
                    this.overlayCtx.lineTo(blockX + cellSize, blockY);                    // Top-right outer
                    this.overlayCtx.lineTo(blockX + cellSize - bevelSize, blockY + bevelSize);  // Top-right inner
                    this.overlayCtx.lineTo(blockX + bevelSize, blockY + bevelSize);         // Top-left inner
                    this.overlayCtx.closePath();
                    this.overlayCtx.fill();
                    
                    // Left bevel (lighter)
                    this.overlayCtx.fillStyle = this.lightenColor(color, 15);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(blockX, blockY);                           // Top-left outer
                    this.overlayCtx.lineTo(blockX, blockY + cellSize);                    // Bottom-left outer
                    this.overlayCtx.lineTo(blockX + bevelSize, blockY + cellSize - bevelSize);  // Bottom-left inner
                    this.overlayCtx.lineTo(blockX + bevelSize, blockY + bevelSize);         // Top-left inner
                    this.overlayCtx.closePath();
                    this.overlayCtx.fill();
                    
                    // Right bevel (darker)
                    this.overlayCtx.fillStyle = this.darkenColor(color, 15);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(blockX + cellSize, blockY);                    // Top-right outer
                    this.overlayCtx.lineTo(blockX + cellSize, blockY + cellSize);             // Bottom-right outer
                    this.overlayCtx.lineTo(blockX + cellSize - bevelSize, blockY + cellSize - bevelSize); // Bottom-right inner
                    this.overlayCtx.lineTo(blockX + cellSize - bevelSize, blockY + bevelSize);        // Top-right inner
                    this.overlayCtx.closePath();
                    this.overlayCtx.fill();
                    
                    // Bottom bevel (darker)
                    this.overlayCtx.fillStyle = this.darkenColor(color, 30);
                    this.overlayCtx.beginPath();
                    this.overlayCtx.moveTo(blockX, blockY + cellSize);                    // Bottom-left outer
                    this.overlayCtx.lineTo(blockX + cellSize, blockY + cellSize);             // Bottom-right outer
                    this.overlayCtx.lineTo(blockX + cellSize - bevelSize, blockY + cellSize - bevelSize); // Bottom-right inner
                    this.overlayCtx.lineTo(blockX + bevelSize, blockY + cellSize - bevelSize);        // Bottom-left inner
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
            
            // Save the selected index before resetting it
            const placedPieceIndex = this.selectedPieceIndex;
            
            // Reset states immediately to prepare for the next actions
            this.dragging = false;
            this.dragStartedFromPiece = false;
            this.selectedPiece = null;
            this.selectedPieceIndex = null;
            
            // Check for completed lines
            this.checkLines();
            
            // Generate and replace the used piece immediately
            if (placedPieceIndex !== null) {
                // Get a new piece
                const newPiece = this.getNextPiece();
                
                // Insert the new piece at the same index
                this.nextPieces[placedPieceIndex] = newPiece;
                
                // Draw the next pieces immediately
                this.drawNextPieces();
            }
            
            // Redraw the game board
            this.draw();
            
            // Check if game is over AFTER generating new pieces
            if (!this.hasValidMoves()) {
                this.showGameOver();
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
        // Store the original blocks for the animation
        const blocks = [];
        
        // Create block objects for each cleared cell
        positions.forEach(pos => {
            blocks.push({
                x: (pos.x + 0.5) * this.blockSize,  // Center position
                y: (pos.y + 0.5) * this.blockSize,  // Center position
                originalColor: pos.color,
                currentColor: pos.color,
                size: this.blockSize,               // Start at full size
                rotation: 0,                        // Initial rotation
                opacity: 1.0,                       // Start fully visible
                bevelSize: Math.max(3, Math.floor(this.blockSize * 0.15))
            });
        });
        
        // Animation timing
        const startTime = performance.now();
        const duration = 800 + (lineCount * 100); // Longer animation for more lines
        const flashDuration = duration * 0.2;     // Initial flash phase
        
        // Animation function
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = elapsed / duration;
            const flashProgress = Math.min(1, elapsed / flashDuration);
            
            if (progress < 1) {
                // Clear canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw regular grid and blocks
                this.draw();
                
                // Draw animated blocks
                blocks.forEach(block => {
                    // Phase 1: Flash to white
                    if (flashProgress < 1) {
                        // Transition from original color to white
                        block.currentColor = this.blendColors(
                            block.originalColor, 
                            '#FFFFFF', 
                            flashProgress
                        );
                        // Slightly increase size for "pop" effect
                        const scaleFactor = 1 + (flashProgress * 0.1);
                        block.size = this.blockSize * scaleFactor;
                    } else {
                        // Phase 2: Rotate, shrink and fade
                        const phase2Progress = (progress - 0.2) / 0.8; // Normalize to 0-1
                        
                        // Accelerating rotation
                        block.rotation = phase2Progress * phase2Progress * Math.PI * 4; // Up to 2 full rotations
                        
                        // Shrink size
                        block.size = this.blockSize * (1 - phase2Progress * 0.9);
                        
                        // Fade out
                        block.opacity = 1 - phase2Progress;
                        
                        // Transition from white to a lighter version of original color
                        block.currentColor = this.blendColors(
                            '#FFFFFF',
                            this.lightenColor(block.originalColor, 50),
                            phase2Progress
                        );
                    }
                    
                    // Draw the rotating block with beveled edges
                    this.ctx.save();
                    
                    // Move to block center, rotate, then draw
                    this.ctx.translate(block.x, block.y);
                    this.ctx.rotate(block.rotation);
                    this.ctx.globalAlpha = block.opacity;
                    
                    const halfSize = block.size / 2;
                    const bevelSize = block.bevelSize * (block.size / this.blockSize); // Scale bevel with block
                    
                    // Main face (center square)
                    this.ctx.fillStyle = block.currentColor;
                    this.ctx.fillRect(
                        -halfSize + bevelSize, 
                        -halfSize + bevelSize, 
                        block.size - bevelSize * 2, 
                        block.size - bevelSize * 2
                    );
                    
                    // Add glow effect
                    if (flashProgress < 1) {
                        this.ctx.shadowColor = 'white';
                        this.ctx.shadowBlur = 15 * flashProgress;
                    }
                    
                    // Top bevel (lighter)
                    this.ctx.fillStyle = this.lightenColor(block.currentColor, 30);
                    this.ctx.beginPath();
                    this.ctx.moveTo(-halfSize, -halfSize);
                    this.ctx.lineTo(halfSize, -halfSize);
                    this.ctx.lineTo(halfSize - bevelSize, -halfSize + bevelSize);
                    this.ctx.lineTo(-halfSize + bevelSize, -halfSize + bevelSize);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Left bevel (lighter)
                    this.ctx.fillStyle = this.lightenColor(block.currentColor, 15);
                    this.ctx.beginPath();
                    this.ctx.moveTo(-halfSize, -halfSize);
                    this.ctx.lineTo(-halfSize, halfSize);
                    this.ctx.lineTo(-halfSize + bevelSize, halfSize - bevelSize);
                    this.ctx.lineTo(-halfSize + bevelSize, -halfSize + bevelSize);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Right bevel (darker)
                    this.ctx.fillStyle = this.darkenColor(block.currentColor, 15);
                    this.ctx.beginPath();
                    this.ctx.moveTo(halfSize, -halfSize);
                    this.ctx.lineTo(halfSize, halfSize);
                    this.ctx.lineTo(halfSize - bevelSize, halfSize - bevelSize);
                    this.ctx.lineTo(halfSize - bevelSize, -halfSize + bevelSize);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
                    // Bottom bevel (darker)
                    this.ctx.fillStyle = this.darkenColor(block.currentColor, 30);
                    this.ctx.beginPath();
                    this.ctx.moveTo(-halfSize, halfSize);
                    this.ctx.lineTo(halfSize, halfSize);
                    this.ctx.lineTo(halfSize - bevelSize, halfSize - bevelSize);
                    this.ctx.lineTo(-halfSize + bevelSize, halfSize - bevelSize);
                    this.ctx.closePath();
                    this.ctx.fill();
                    
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
    
    // Helper function to blend between two colors
    blendColors(color1, color2, ratio) {
        // Parse the colors
        const c1 = parseInt(color1.slice(1), 16);
        const c2 = parseInt(color2.slice(1), 16);
        
        // Extract RGB components
        const r1 = (c1 >> 16) & 0xFF;
        const g1 = (c1 >> 8) & 0xFF;
        const b1 = c1 & 0xFF;
        
        const r2 = (c2 >> 16) & 0xFF;
        const g2 = (c2 >> 8) & 0xFF;
        const b2 = c2 & 0xFF;
        
        // Blend the colors
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        // Convert back to hex
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('blockGameHighScore', this.highScore);
            return true;
        }
        return false;
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
        const blockX = x * this.blockSize;
        const blockY = y * this.blockSize;
        const size = this.blockSize;
        
        // Size of the bevel (edge)
        const bevelSize = Math.max(3, Math.floor(size * 0.15));
        
        if (!isPreview) {
            // Main face (center square)
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                blockX + bevelSize, 
                blockY + bevelSize, 
                size - bevelSize * 2, 
                size - bevelSize * 2
            );
            
            // Top bevel (lighter)
            this.ctx.fillStyle = this.lightenColor(color, 30);
            this.ctx.beginPath();
            this.ctx.moveTo(blockX, blockY);                           // Top-left outer
            this.ctx.lineTo(blockX + size, blockY);                    // Top-right outer
            this.ctx.lineTo(blockX + size - bevelSize, blockY + bevelSize);  // Top-right inner
            this.ctx.lineTo(blockX + bevelSize, blockY + bevelSize);         // Top-left inner
            this.ctx.closePath();
            this.ctx.fill();
            
            // Left bevel (lighter)
            this.ctx.fillStyle = this.lightenColor(color, 15);
            this.ctx.beginPath();
            this.ctx.moveTo(blockX, blockY);                           // Top-left outer
            this.ctx.lineTo(blockX, blockY + size);                    // Bottom-left outer
            this.ctx.lineTo(blockX + bevelSize, blockY + size - bevelSize);  // Bottom-left inner
            this.ctx.lineTo(blockX + bevelSize, blockY + bevelSize);         // Top-left inner
            this.ctx.closePath();
            this.ctx.fill();
            
            // Right bevel (darker)
            this.ctx.fillStyle = this.darkenColor(color, 15);
            this.ctx.beginPath();
            this.ctx.moveTo(blockX + size, blockY);                    // Top-right outer
            this.ctx.lineTo(blockX + size, blockY + size);             // Bottom-right outer
            this.ctx.lineTo(blockX + size - bevelSize, blockY + size - bevelSize); // Bottom-right inner
            this.ctx.lineTo(blockX + size - bevelSize, blockY + bevelSize);        // Top-right inner
            this.ctx.closePath();
            this.ctx.fill();
            
            // Bottom bevel (darker)
            this.ctx.fillStyle = this.darkenColor(color, 30);
            this.ctx.beginPath();
            this.ctx.moveTo(blockX, blockY + size);                    // Bottom-left outer
            this.ctx.lineTo(blockX + size, blockY + size);             // Bottom-right outer
            this.ctx.lineTo(blockX + size - bevelSize, blockY + size - bevelSize); // Bottom-right inner
            this.ctx.lineTo(blockX + bevelSize, blockY + size - bevelSize);        // Bottom-left inner
            this.ctx.closePath();
            this.ctx.fill();
        } else {
            // Simplified version for preview
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                blockX + 1, 
                blockY + 1, 
                size - 2, 
                size - 2
            );
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
        // First, determine the maximum piece dimension across all next pieces
        // This ensures consistent block sizing across all shapes
        const maxPieceDimensionAcrossAll = Math.max(
            ...this.nextPieces.map(piece => 
                Math.max(piece.shape.length, piece.shape[0].length)
            )
        );
        
        // Calculate a consistent block size that works for all pieces
        const commonBlockSize = Math.floor(this.nextPieceCanvases[0].width / (maxPieceDimensionAcrossAll + 1.5));
        
        // Clear all next piece canvases
        this.nextPieceCanvases.forEach((canvas, index) => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
        
        // Draw the next pieces
        this.nextPieceCanvases.forEach((canvas, index) => {
            if (index >= this.nextPieces.length) return;
            
            const ctx = canvas.getContext('2d');
            const piece = this.nextPieces[index];
            
            if (!piece) {
                return;
            }
            
            // Skip rest of drawing if piece is being dragged
            if (this.selectedPieceIndex === index && this.dragging) {
                return;
            }
            
            // Use the common block size for all pieces
            const blockSize = commonBlockSize;
            
            // Reset shadow for drawing
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            
            // Calculate piece dimensions
            const pieceWidth = piece.shape[0].length * blockSize;
            const pieceHeight = piece.shape.length * blockSize;
            
            // Center the piece
            const offsetX = (canvas.width - pieceWidth) / 2;
            const offsetY = (canvas.height - pieceHeight) / 2;
            
            // Draw piece with 3D effect
            const color = piece.color;
            for (let i = 0; i < piece.shape.length; i++) {
                for (let j = 0; j < piece.shape[i].length; j++) {
                    if (piece.shape[i][j]) {
                        const blockX = offsetX + j * blockSize;
                        const blockY = offsetY + i * blockSize;
                        
                        // Size of the bevel (edge)
                        const bevelSize = Math.max(2, Math.floor(blockSize * 0.15));
                        
                        // Main face (center square)
                        ctx.fillStyle = color;
                        ctx.fillRect(
                            blockX + bevelSize, 
                            blockY + bevelSize, 
                            blockSize - bevelSize * 2, 
                            blockSize - bevelSize * 2
                        );
                        
                        // Top bevel (lighter)
                        ctx.fillStyle = this.lightenColor(color, 30);
                        ctx.beginPath();
                        ctx.moveTo(blockX, blockY);                           // Top-left outer
                        ctx.lineTo(blockX + blockSize, blockY);                    // Top-right outer
                        ctx.lineTo(blockX + blockSize - bevelSize, blockY + bevelSize);  // Top-right inner
                        ctx.lineTo(blockX + bevelSize, blockY + bevelSize);         // Top-left inner
                        ctx.closePath();
                        ctx.fill();
                        
                        // Left bevel (lighter)
                        ctx.fillStyle = this.lightenColor(color, 15);
                        ctx.beginPath();
                        ctx.moveTo(blockX, blockY);                           // Top-left outer
                        ctx.lineTo(blockX, blockY + blockSize);                    // Bottom-left outer
                        ctx.lineTo(blockX + bevelSize, blockY + blockSize - bevelSize);  // Bottom-left inner
                        ctx.lineTo(blockX + bevelSize, blockY + bevelSize);         // Top-left inner
                        ctx.closePath();
                        ctx.fill();
                        
                        // Right bevel (darker)
                        ctx.fillStyle = this.darkenColor(color, 15);
                        ctx.beginPath();
                        ctx.moveTo(blockX + blockSize, blockY);                    // Top-right outer
                        ctx.lineTo(blockX + blockSize, blockY + blockSize);             // Bottom-right outer
                        ctx.lineTo(blockX + blockSize - bevelSize, blockY + blockSize - bevelSize); // Bottom-right inner
                        ctx.lineTo(blockX + blockSize - bevelSize, blockY + bevelSize);        // Top-right inner
                        ctx.closePath();
                        ctx.fill();
                        
                        // Bottom bevel (darker)
                        ctx.fillStyle = this.darkenColor(color, 30);
                        ctx.beginPath();
                        ctx.moveTo(blockX, blockY + blockSize);                    // Bottom-left outer
                        ctx.lineTo(blockX + blockSize, blockY + blockSize);             // Bottom-right outer
                        ctx.lineTo(blockX + blockSize - bevelSize, blockY + blockSize - bevelSize); // Bottom-right inner
                        ctx.lineTo(blockX + bevelSize, blockY + blockSize - bevelSize);        // Bottom-left inner
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
        document.removeEventListener('touchmove', this._onDocTouchMove);
        document.removeEventListener('touchend', this._onDocTouchEnd);
        document.removeEventListener('mousemove', this._onDocMouseMove);
        document.removeEventListener('mouseup', this._onDocMouseUp);
    }
    
    showGameOver() {
        // Check if we have a new high score
        const isNewHighScore = this.updateHighScore();
        
        // Create content for the game over overlay
        this.gameOverContent.innerHTML = `
            <h2>Game Over!</h2>
            <div class="final-score-container">
                <div class="final-score-label">Final Score</div>
                <div class="final-score-value">${this.score}</div>
                
                <div class="high-score-container">
                    <div class="high-score-label">
                        High Score
                        ${isNewHighScore ? '<span class="new-high-score-badge">New!</span>' : ''}
                    </div>
                    <div class="high-score-value">${this.highScore}</div>
                </div>
            </div>
            <div class="game-over-buttons">
                <button id="new-game-button" class="game-over-button">Play Again</button>
            </div>
        `;
        
        // Add CSS to the document if it doesn't exist yet
        if (!document.getElementById('game-over-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'game-over-styles';
            styleElement.textContent = `
                .game-over-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 2000;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }
                
                .game-over-content {
                    background: var(--card-background, #282a3a);
                    border: 8px solid var(--grid-border, #3d4158);
                    border-radius: 20px;
                    padding: 30px;
                    text-align: center;
                    width: 80%;
                    max-width: 400px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    transform: translateY(30px);
                    opacity: 0;
                    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                                opacity 0.6s ease;
                }
                
                .game-over-overlay.visible .game-over-content {
                    transform: translateY(0);
                    opacity: 1;
                }
                
                .game-over-overlay h2 {
                    font-size: 36px;
                    margin: 0 0 20px 0;
                    background: linear-gradient(135deg, var(--accent-color, #00D2D3), var(--primary-color, #6C5CE7));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                
                .final-score-container {
                    background: var(--background-color, #1e2030);
                    border-radius: 15px;
                    padding: 20px;
                    margin: 20px 0 30px;
                    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.2);
                }
                
                .final-score-label {
                    font-size: 18px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 10px;
                    color: var(--text-color, #ffffff);
                    opacity: 0.8;
                }
                
                .final-score-value {
                    font-size: 48px;
                    font-weight: bold;
                    color: var(--accent-color, #00D2D3);
                    text-shadow: 0 2px 10px rgba(0, 210, 211, 0.3);
                    margin-bottom: 15px;
                }
                
                .high-score-container {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 2px solid rgba(255, 255, 255, 0.1);
                }
                
                .high-score-label {
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                    color: var(--text-color, #ffffff);
                    opacity: 0.6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .high-score-value {
                    font-size: 28px;
                    font-weight: bold;
                    color: var(--primary-color, #6C5CE7);
                }
                
                .new-high-score-badge {
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    color: #000;
                    font-weight: bold;
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    display: inline-block;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    box-shadow: 0 1px 3px rgba(255, 215, 0, 0.5);
                }
                
                .game-over-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 15px;
                }
                
                .game-over-button {
                    background: linear-gradient(135deg, var(--accent-color, #00D2D3), var(--primary-color, #6C5CE7));
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px var(--shadow-color, rgba(0, 0, 0, 0.25));
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .game-over-button:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 6px 16px var(--shadow-color, rgba(0, 0, 0, 0.25));
                    filter: brightness(1.1);
                }
                
                .game-over-button:active {
                    transform: translateY(-1px);
                }
                
                @keyframes scoreCountUp {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                
                .final-score-value {
                    animation: scoreCountUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                
                @media (max-width: 400px) {
                    .game-over-content {
                        padding: 20px;
                    }
                    
                    .game-over-overlay h2 {
                        font-size: 28px;
                    }
                    
                    .final-score-value {
                        font-size: 36px;
                    }
                    
                    .high-score-value {
                        font-size: 24px;
                    }
                    
                    .game-over-button {
                        padding: 12px 24px;
                        font-size: 16px;
                    }
                    
                    .new-high-score-badge {
                        font-size: 10px;
                        padding: 1px 6px;
                    }
                }
            `;
            document.head.appendChild(styleElement);
        }
        
        // Show the overlay with animation
        this.gameOverOverlay.style.display = 'flex';
        
        // Trigger reflow to ensure the transition works
        void this.gameOverOverlay.offsetWidth;
        
        // Fade in the overlay
        this.gameOverOverlay.style.opacity = '1';
        
        // Add the visible class after a short delay to trigger the content animation
        setTimeout(() => {
            this.gameOverOverlay.classList.add('visible');
        }, 100);
        
        // Add event listener to the new game button
        document.getElementById('new-game-button').addEventListener('click', () => {
            // Hide the overlay
            this.gameOverOverlay.style.opacity = '0';
            this.gameOverOverlay.classList.remove('visible');
            
            // Wait for the animation to complete before hiding
            setTimeout(() => {
                this.gameOverOverlay.style.display = 'none';
                this.initGame();
            }, 500);
        });
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 
