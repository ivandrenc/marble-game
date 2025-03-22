import * as THREE from 'three';

export default class LandmarksManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.landmarks = {
      peaks: []
    };
  }
  
  // Add major peaks as landmarks
  addMajorPeaks(peaksData) {
    if (!peaksData || !this.terrain) return;
    
    peaksData.forEach(peak => {
      // Only add peaks that are within our bounds (Chimborazo region)
      const peakPosition = this.terrain.geoToWorldPosition(peak.lat, peak.lng);
      
      // Skip peaks outside our terrain bounds
      if (Math.abs(peakPosition.x) > this.terrain.terrainWidth/2 || 
          Math.abs(peakPosition.z) > this.terrain.terrainLength/2) {
        return;
      }
      
      // Create a simple landmark cone for each peak
      const peakGeometry = new THREE.ConeGeometry(2, 4, 4);
      const peakMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        emissive: 0x330000
      });
      const peakMesh = new THREE.Mesh(peakGeometry, peakMaterial);
      
      // Position at geographical coordinates
      peakMesh.position.copy(peakPosition);
      
      // Add label
      const peakLabel = this.createLandmarkLabel(peak.name, peakPosition);
      
      // Set the peak mesh properties
      peakMesh.userData = {
        type: 'peak',
        name: peak.name,
        elevation: peak.elevation,
        label: peakLabel
      };
      
      // Add to scene
      this.scene.add(peakMesh);
      this.landmarks.peaks.push(peakMesh);
    });
  }
  
  // Create text label for landmarks
  createLandmarkLabel(text, position) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Draw text
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    // Position above the landmark
    sprite.position.copy(position);
    sprite.position.y += 20;
    
    // Scale the sprite
    sprite.scale.set(10, 2.5, 1);
    
    // Add to scene
    this.scene.add(sprite);
    
    return sprite;
  }
  
  // Set the terrain reference - used when terrain is created
  setTerrain(terrain) {
    this.terrain = terrain;
  }
} 