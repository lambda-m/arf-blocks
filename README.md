# Block Puzzle PWA

A Progressive Web App (PWA) recreating a block puzzle game for iOS. Place various shaped blocks on a 10x10 grid, clear lines, and score points. Designed to be ad-free and installable on iPhone via Safari.

## Features

- 10x10 grid game board
- Three random blocks to choose from
- Drag-and-drop block placement
- Line clearing (horizontal/vertical)
- Progressive scoring system
- Offline play capability
- Installable on iOS home screen

## Scoring System

- 1 point per placed block
- 10 points for first line cleared
- Progressive bonus for multiple lines:
  - First line: 10 points
  - Second line: 20 points
  - Third line: 40 points
  - And so on...

## Development Setup

1. Clone the repository
2. Install dependencies (if any)
3. Run a local server:
   ```bash
   python -m http.server 8000
   ```
4. Open in browser: `http://localhost:8000`

## Project Structure

```
block-puzzle-pwa/
├── index.html          # Main entry point
├── css/
│   └── styles.css      # Game styling
├── js/
│   ├── game.js         # Core game logic
│   └── pwa.js          # PWA functionality
├── assets/
│   ├── icon-192.png    # PWA icon (192x192)
│   └── icon-512.png    # PWA icon (512x512)
├── manifest.json       # PWA manifest
└── service-worker.js   # Offline caching
```

## Installation on iOS

1. Open the game in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Launch from home screen for full-screen experience

## Development Notes

- Built with vanilla JavaScript for maximum compatibility
- Uses Canvas for game rendering
- Touch events optimized for iOS
- Responsive design for different screen sizes
- Easy to customize colors and shapes

## License

MIT License - feel free to use and modify as needed.