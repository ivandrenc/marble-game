# Condor Adventure

A 3D game built with Three.js where you control a condor flying over South America.

## Description

Condor Adventure lets you soar as a majestic Andean condor over the continent of South America. Explore the landscapes, mountains, and terrain from a bird's eye view.

## Features

- 3D world representing South America with realistic terrain
- Detailed elevation data with major mountain ranges and peaks
- Landmark identification for major mountain peaks
- Third-person camera view from behind the condor
- Flight controls with keyboard
- Live altitude and position display

## Controls

- **Arrow keys**: Control direction (left/right to turn, up/down to adjust speed)
- **W/S keys**: Ascend/descend
- **Mouse**: Look around (when orbit controls are enabled)

## Technical Details

The terrain system uses:
- Synthetic elevation data that mimics the real topography of South America
- Real locations of major mountain peaks (e.g., Aconcagua, Chimborazo)
- Accurate geographical boundaries and mountain range placement
- Dynamic terrain coloring based on elevation
- Groundwork for future integration with real elevation data APIs

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open your browser to the indicated URL (usually http://localhost:5173)

## Future Enhancements

- Integration with real SRTM elevation data
- Country borders and names
- Additional points of interest and landmarks
- Improved condor model and animations
- Weather effects
- Mission/objective system

## Technology

Built with:
- Three.js - 3D JavaScript library
- Vite - Build tool and development server 