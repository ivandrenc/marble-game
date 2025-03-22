// Ecuador approximate boundaries focused on Chimborazo region
// Latitude: 0.5°S to 2.5°S
// Longitude: 77.5°W to 79.5°W

// This file will provide access to Ecuador elevation data with focus on Chimborazo
// Using a provided heightmap image

import * as THREE from 'three';

// Sample resolution for our heightmap
export const HEIGHTMAP_WIDTH = 256;
export const HEIGHTMAP_HEIGHT = 256;

// Geographic boundaries of Chimborazo region in Ecuador
export const GEO_BOUNDS = {
  north: -0.5,  // Northern latitude boundary (degrees)
  south: -2.5,  // Southern latitude boundary (degrees)
  west: -79.5,  // Western longitude boundary (degrees)
  east: -77.5   // Eastern longitude boundary (degrees)
};

// Maximum height of Chimborazo (~6,263 meters)
export const MAX_ELEVATION = 6300;

// Function to load the provided heightmap image
export async function loadHeightmapFromImage(imagePath = '/chimborazo-heightmap.png') {
  return new Promise((resolve, reject) => {
    // Create a new image element
    const img = new Image();
    
    // Set up image loading
    img.onload = function() {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      canvas.width = HEIGHTMAP_WIDTH;
      canvas.height = HEIGHTMAP_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      // Draw the image to the canvas, scaling if needed
      ctx.drawImage(img, 0, 0, HEIGHTMAP_WIDTH, HEIGHTMAP_HEIGHT);
      
      // Get the pixel data
      const imageData = ctx.getImageData(0, 0, HEIGHTMAP_WIDTH, HEIGHTMAP_HEIGHT);
      const pixels = imageData.data;
      
      // Convert to heightmap data (grayscale to height)
      const heightmapData = new Float32Array(HEIGHTMAP_WIDTH * HEIGHTMAP_HEIGHT);
      
      for (let i = 0; i < heightmapData.length; i++) {
        // Each pixel has 4 values (RGBA), we use the R value for grayscale
        // Normalize to 0-1 range
        heightmapData[i] = pixels[i * 4] / 255;
      }
      
      resolve(heightmapData);
    };
    
    img.onerror = function() {
      console.error('Failed to load heightmap image');
      // Fallback to synthetic data
      resolve(generateSyntheticHeightmap());
    };
    
    // Set the image source to trigger loading
    img.src = imagePath;
  });
}

// Generate a synthetic heightmap as fallback
export function generateSyntheticHeightmap() {
  const data = new Float32Array(HEIGHTMAP_WIDTH * HEIGHTMAP_HEIGHT);
  
  // Parameters for the Chimborazo region
  const chimborazoX = Math.floor(HEIGHTMAP_WIDTH * 0.5); // Center X
  const chimborazoY = Math.floor(HEIGHTMAP_HEIGHT * 0.5); // Center Y
  const peakRadius = HEIGHTMAP_WIDTH * 0.15; // Peak radius
  
  // Fill the array with elevation data
  for (let y = 0; y < HEIGHTMAP_HEIGHT; y++) {
    for (let x = 0; x < HEIGHTMAP_WIDTH; x++) {
      const index = y * HEIGHTMAP_WIDTH + x;
      
      // Base elevation
      let elevation = 0.05; // Base elevation is 5% of max
      
      // Distance from Chimborazo peak
      const distFromPeak = Math.sqrt(
        Math.pow(x - chimborazoX, 2) + 
        Math.pow(y - chimborazoY, 2)
      );
      
      if (distFromPeak < peakRadius) {
        // Create the main peak
        const peakFactor = Math.pow((peakRadius - distFromPeak) / peakRadius, 2);
        elevation = Math.max(elevation, peakFactor);
      }
      
      // Add some ridge features (representing the Andes)
      const ridgeX = 0.7 * HEIGHTMAP_WIDTH;
      const ridgeWidth = 0.2 * HEIGHTMAP_WIDTH;
      const distFromRidge = Math.abs(x - ridgeX);
      
      if (distFromRidge < ridgeWidth) {
        const ridgeFactor = 0.3 * Math.pow((ridgeWidth - distFromRidge) / ridgeWidth, 2);
        
        // Add some variation to the ridge
        const ridgeNoise = Math.sin(y * 0.1) * 0.1 + Math.cos(y * 0.05) * 0.1;
        
        elevation = Math.max(elevation, ridgeFactor + ridgeNoise);
      }
      
      // Add some noise for natural variation
      const noise = (Math.sin(x * 0.5) * Math.cos(y * 0.5) + Math.sin(x * 0.1 + y * 0.1)) * 0.05;
      elevation += noise;
      
      // Clamp to 0-1 range
      elevation = Math.max(0, Math.min(1, elevation));
      
      // Store in array
      data[index] = elevation;
    }
  }
  
  return data;
}

// Function to get elevation at a specific geographic coordinate
export function getElevationAtCoordinate(lat, lng, heightmapData) {
  // Convert geographical coordinates to heightmap indices
  const latRange = GEO_BOUNDS.north - GEO_BOUNDS.south;
  const lngRange = GEO_BOUNDS.east - GEO_BOUNDS.west;
  
  const y = Math.floor((GEO_BOUNDS.north - lat) / latRange * HEIGHTMAP_HEIGHT);
  const x = Math.floor((lng - GEO_BOUNDS.west) / lngRange * HEIGHTMAP_WIDTH);
  
  // Bounds check
  if (x < 0 || x >= HEIGHTMAP_WIDTH || y < 0 || y >= HEIGHTMAP_HEIGHT) {
    return 0;
  }
  
  return heightmapData[y * HEIGHTMAP_WIDTH + x] * MAX_ELEVATION;
}

// Export an API for accessing and working with the heightmap
export default {
  loadHeightmapFromImage,
  generateSyntheticHeightmap,
  getElevationAtCoordinate,
  HEIGHTMAP_WIDTH,
  HEIGHTMAP_HEIGHT,
  GEO_BOUNDS,
  MAX_ELEVATION
}; 