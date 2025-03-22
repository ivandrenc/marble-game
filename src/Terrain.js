import * as THREE from 'three';
import heightmapData, { 
  HEIGHTMAP_WIDTH, 
  HEIGHTMAP_HEIGHT, 
  GEO_BOUNDS,
  MAX_ELEVATION,
  generateSyntheticHeightmap, 
  getElevationAtCoordinate 
} from './data/heightmap.js';

export default class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.heightData = null; // Will be set via heightmap image
    this.terrain = null;
    this.heightScale = 400; // Further increased vertical scaling for more dramatic terrain
    this.terrainWidth = 2000; // Significantly increased width for vastly larger terrain
    this.terrainLength = 2000; // Significantly increased length for vastly larger terrain
  }

  generateTerrain() {
    // First we'll create a plane geometry
    const geometry = new THREE.PlaneGeometry(
      this.terrainWidth, 
      this.terrainLength,
      HEIGHTMAP_WIDTH - 1, 
      HEIGHTMAP_HEIGHT - 1
    );
    
    // Apply the heightmap to the geometry vertices
    const positionAttribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Convert from local coordinates to heightmap indices
      const x = Math.floor(((vertex.x / this.terrainWidth) + 0.5) * HEIGHTMAP_WIDTH);
      const y = Math.floor(((vertex.y / this.terrainLength) + 0.5) * HEIGHTMAP_HEIGHT);
      
      // Bounds check to prevent accessing out of the array
      if (x >= 0 && x < HEIGHTMAP_WIDTH && y >= 0 && y < HEIGHTMAP_HEIGHT) {
        const heightIndex = y * HEIGHTMAP_WIDTH + x;
        const height = this.heightData[heightIndex] * this.heightScale;
        
        // Apply height to vertex
        vertex.z = height;
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
    }
    
    // Update normals for lighting calculations
    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;
    
    // Create terrain material with texture
    const material = this.createTerrainMaterial();
    
    // Create mesh and add to scene
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2; // Rotate to horizontal plane
    this.terrain.receiveShadow = true;
    this.terrain.castShadow = true;
    
    // Center the terrain
    this.terrain.position.set(0, 0, 0);
    
    this.scene.add(this.terrain);
    
    return this.terrain;
  }
  
  createTerrainMaterial() {
    // Create a texture to visualize the elevation data
    const heightMapTexture = this.createHeightMapTexture();
    
    // Load textures for different terrain types - specialized for Ecuador's terrain
    const textureLoader = new THREE.TextureLoader();
    const terrainTypes = {
      lowland: {
        color: 0x228B22, // Forest green (for tropical lowlands)
        elevation: 0.1
      },
      midland: {
        color: 0x8B4513, // Brown (for foothills)
        elevation: 0.3
      },
      highland: {
        color: 0x808080, // Gray (for rocky terrain)
        elevation: 0.6
      },
      mountain: {
        color: 0xFFFFFF, // White (snow peaks of the volcanoes)
        elevation: 1.0
      }
    };
    
    // Create material with combined texture
    const material = new THREE.MeshStandardMaterial({
      map: heightMapTexture,
      displacementMap: heightMapTexture,
      displacementScale: 0, // We're handling displacement manually
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false,
      flatShading: true,
      vertexColors: false
    });
    
    return material;
  }
  
  createHeightMapTexture() {
    // Create a canvas to draw the heightmap
    const canvas = document.createElement('canvas');
    canvas.width = HEIGHTMAP_WIDTH;
    canvas.height = HEIGHTMAP_HEIGHT;
    const context = canvas.getContext('2d');
    
    // Create ImageData from the heightmap
    const imageData = context.createImageData(HEIGHTMAP_WIDTH, HEIGHTMAP_HEIGHT);
    const data = imageData.data;
    
    // Color ramp based on elevation - adjusted for Ecuador's vegetation zones
    const colorRamp = [
      { elevation: 0.0, color: [20, 120, 20] },    // Dark green (lowland rainforest)
      { elevation: 0.15, color: [46, 139, 87] },   // Sea green (subtropical forest)
      { elevation: 0.3, color: [85, 107, 47] },    // Olive drab (higher elevation forest)
      { elevation: 0.45, color: [160, 120, 60] },  // Tan (paramo/highland grassland)
      { elevation: 0.6, color: [139, 69, 19] },    // Brown (rocky terrain)
      { elevation: 0.75, color: [169, 169, 169] }, // Gray (high volcanic rock)
      { elevation: 0.85, color: [211, 211, 211] }, // Light gray (scree/volcanic ash)
      { elevation: 1.0, color: [255, 255, 255] }   // White (snow cap)
    ];
    
    // Fill the image data
    for (let y = 0; y < HEIGHTMAP_HEIGHT; y++) {
      for (let x = 0; x < HEIGHTMAP_WIDTH; x++) {
        const index = y * HEIGHTMAP_WIDTH + x;
        const pixelIndex = index * 4;
        
        const elevation = this.heightData[index];
        
        // Determine color based on elevation
        let color = [0, 0, 0];
        
        // Find the color stops for interpolation
        for (let i = 0; i < colorRamp.length - 1; i++) {
          const current = colorRamp[i];
          const next = colorRamp[i + 1];
          
          if (elevation >= current.elevation && elevation <= next.elevation) {
            // Linear interpolation between color stops
            const t = (elevation - current.elevation) / (next.elevation - current.elevation);
            
            color[0] = Math.floor(current.color[0] * (1 - t) + next.color[0] * t);
            color[1] = Math.floor(current.color[1] * (1 - t) + next.color[1] * t);
            color[2] = Math.floor(current.color[2] * (1 - t) + next.color[2] * t);
            break;
          }
        }
        
        // Set RGBA values
        data[pixelIndex] = color[0];     // R
        data[pixelIndex + 1] = color[1]; // G
        data[pixelIndex + 2] = color[2]; // B
        data[pixelIndex + 3] = 255;      // A (fully opaque)
      }
    }
    
    // Put the image data on the canvas
    context.putImageData(imageData, 0, 0);
    
    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    return texture;
  }
  
  // Get height at a specific world position
  getHeightAtPosition(x, z) {
    if (!this.terrain) return 0;
    
    // Convert world coordinates to a position on our heightmap
    const normalizedX = (x / this.terrainWidth) + 0.5;
    const normalizedZ = (z / this.terrainLength) + 0.5;
    
    // Convert to heightmap indices
    const heightmapX = Math.floor(normalizedX * HEIGHTMAP_WIDTH);
    const heightmapY = Math.floor(normalizedZ * HEIGHTMAP_HEIGHT);
    
    // Bounds check
    if (heightmapX < 0 || heightmapX >= HEIGHTMAP_WIDTH || 
        heightmapY < 0 || heightmapY >= HEIGHTMAP_HEIGHT) {
      return 0;
    }
    
    // Get height value and scale it
    const index = heightmapY * HEIGHTMAP_WIDTH + heightmapX;
    return this.heightData[index] * this.heightScale;
  }
  
  // Get height at geographical coordinates (latitude, longitude)
  getHeightAtCoordinates(lat, lng) {
    return getElevationAtCoordinate(lat, lng, this.heightData) * 
           (this.heightScale / MAX_ELEVATION);
  }
  
  // Convert geographical coordinates to world position
  geoToWorldPosition(lat, lng) {
    // Calculate normalized position (0-1) within our bounds
    const latRange = GEO_BOUNDS.north - GEO_BOUNDS.south;
    const lngRange = GEO_BOUNDS.east - GEO_BOUNDS.west;
    
    const normalizedLat = (GEO_BOUNDS.north - lat) / latRange;
    const normalizedLng = (lng - GEO_BOUNDS.west) / lngRange;
    
    // Convert to world coordinates
    const x = (normalizedLng - 0.5) * this.terrainWidth;
    const z = (normalizedLat - 0.5) * this.terrainLength;
    const y = this.getHeightAtPosition(x, z);
    
    return new THREE.Vector3(x, y, z);
  }
  
  // Convert world position to geographical coordinates
  worldToGeoPosition(x, y, z) {
    // Convert world coordinates to normalized position (0-1)
    const normalizedX = (x / this.terrainWidth) + 0.5;
    const normalizedZ = (z / this.terrainLength) + 0.5;
    
    // Convert to geographical coordinates
    const latRange = GEO_BOUNDS.north - GEO_BOUNDS.south;
    const lngRange = GEO_BOUNDS.east - GEO_BOUNDS.west;
    
    const lat = GEO_BOUNDS.north - (normalizedZ * latRange);
    const lng = GEO_BOUNDS.west + (normalizedX * lngRange);
    
    return { lat, lng };
  }
} 