import heightmapData, { 
  HEIGHTMAP_WIDTH, 
  HEIGHTMAP_HEIGHT, 
  GEO_BOUNDS,
  MAX_ELEVATION,
  generateSyntheticHeightmap,
  loadHeightmapFromImage
} from './heightmap.js';

// This service loads and processes elevation data for Ecuador's Chimborazo region

// Major peaks in Ecuador
const MAJOR_PEAKS = [
  { name: "Chimborazo", lat: -1.4697, lng: -78.8169, elevation: 6263 },        // Ecuador's highest
  { name: "Cotopaxi", lat: -0.6837, lng: -78.4370, elevation: 5897 },           // Ecuador's active volcano
  { name: "Cayambe", lat: 0.0292, lng: -77.9861, elevation: 5790 },            // Ecuador's 3rd highest
  { name: "Antisana", lat: -0.4811, lng: -78.1417, elevation: 5704 },          // Major volcano
  { name: "Altar", lat: -1.6667, lng: -78.4167, elevation: 5320 }              // Complex volcano
];

// Function to check if a point is within our bounds
function isInBounds(lat, lng, bounds) {
  return lat <= bounds.north && 
         lat >= bounds.south && 
         lng >= bounds.west && 
         lng <= bounds.east;
}

// Function to calculate distance between two geographical points
function geoDistance(lat1, lng1, lat2, lng2) {
  // Convert to radians
  const toRad = (deg) => deg * Math.PI / 180;
  
  const rlat1 = toRad(lat1);
  const rlng1 = toRad(lng1);
  const rlat2 = toRad(lat2);
  const rlng2 = toRad(lng2);
  
  // Haversine formula
  const dlat = rlat2 - rlat1;
  const dlng = rlng2 - rlng1;
  const a = Math.sin(dlat/2) * Math.sin(dlat/2) +
            Math.cos(rlat1) * Math.cos(rlat2) *
            Math.sin(dlng/2) * Math.sin(dlng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Earth's approximate radius in kilometers
  const R = 6371;
  return R * c;
}

// Process and enhance the heightmap to better represent peaks
export function enhanceHeightmap(heightmapData) {
  // Create a copy of the heightmap data
  const enhancedData = new Float32Array(HEIGHTMAP_WIDTH * HEIGHTMAP_HEIGHT);
  
  // First, copy over the original data
  for (let i = 0; i < heightmapData.length; i++) {
    enhancedData[i] = heightmapData[i];
  }
  
  // Ensure the peaks are represented accurately
  MAJOR_PEAKS.forEach(peak => {
    // Only process peaks that are within our bounds
    if (isInBounds(peak.lat, peak.lng, GEO_BOUNDS)) {
      // Convert geographical coordinates to heightmap indices
      const latRange = GEO_BOUNDS.north - GEO_BOUNDS.south;
      const lngRange = GEO_BOUNDS.east - GEO_BOUNDS.west;
      
      const y = Math.floor((GEO_BOUNDS.north - peak.lat) / latRange * HEIGHTMAP_HEIGHT);
      const x = Math.floor((peak.lng - GEO_BOUNDS.west) / lngRange * HEIGHTMAP_WIDTH);
      
      // Add peak with radius influence
      const peakElevation = peak.elevation / MAX_ELEVATION;
      const influenceRadius = 15; // Radius of influence in heightmap cells
      
      for (let iy = Math.max(0, y - influenceRadius); iy < Math.min(HEIGHTMAP_HEIGHT, y + influenceRadius); iy++) {
        for (let ix = Math.max(0, x - influenceRadius); ix < Math.min(HEIGHTMAP_WIDTH, x + influenceRadius); ix++) {
          const distance = Math.sqrt((ix - x) ** 2 + (iy - y) ** 2);
          
          if (distance < influenceRadius) {
            const index = iy * HEIGHTMAP_WIDTH + ix;
            
            // Use a bell curve falloff from the peak
            const influence = Math.exp(-(distance ** 2) / (2 * (influenceRadius / 3) ** 2));
            
            // Blend with existing elevation, giving more weight to higher values
            enhancedData[index] = Math.max(
              enhancedData[index],
              enhancedData[index] * (1 - influence) + peakElevation * influence
            );
          }
        }
      }
    }
  });
  
  // Add some noise for natural variation
  for (let i = 0; i < enhancedData.length; i++) {
    const x = i % HEIGHTMAP_WIDTH;
    const y = Math.floor(i / HEIGHTMAP_WIDTH);
    
    // Small noise contribution
    const noise = (Math.sin(x * 0.3) * Math.cos(y * 0.4) + Math.sin(x * 0.1 + y * 0.2)) * 0.01;
    enhancedData[i] += noise;
    
    // Ensure values are within range
    enhancedData[i] = Math.max(0, Math.min(1, enhancedData[i]));
  }
  
  return enhancedData;
}

// Function to fetch elevation data from the image
export async function fetchElevationData() {
  try {
    // Load the heightmap from the provided image
    const imageData = await loadHeightmapFromImage('/chimborazo-heightmap.png');
    
    // Enhance the heightmap with more accurate peak data
    const enhancedData = enhanceHeightmap(imageData);
    
    return enhancedData;
  } catch (error) {
    console.error('Error loading heightmap image:', error);
    
    // Fallback to synthetic data if image loading fails
    console.log('Falling back to synthetic heightmap');
    const baseData = generateSyntheticHeightmap();
    return enhanceHeightmap(baseData);
  }
}

export default {
  fetchElevationData,
  enhanceHeightmap,
  MAJOR_PEAKS
}; 