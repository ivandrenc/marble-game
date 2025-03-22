import * as THREE from 'three';

export default class FlightControls {
  constructor(condorModel, terrain) {
    this.condorModel = condorModel;
    this.terrain = terrain;
    this.condor = condorModel ? condorModel.getMesh() : null;
    
    // Flight controls state
    this.state = {
      speed: 0.1,
      rotationSpeed: 0.03,
      maxSpeed: 0.3,
      minSpeed: 0.05,
      verticalSpeed: 0,
      lastRotation: 0
    };
    
    // Current position
    this.position = {
      lat: -1.5, // Approximately near Chimborazo
      lng: -78.8,
      elevation: 0
    };
    
    // Key state
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      w: false,
      s: false
    };
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }
  
  onKeyDown(e) {
    if (this.keys.hasOwnProperty(e.key)) {
      this.keys[e.key] = true;
    }
  }
  
  onKeyUp(e) {
    if (this.keys.hasOwnProperty(e.key)) {
      this.keys[e.key] = false;
    }
  }
  
  update() {
    if (!this.condor || !this.terrain || !this.condorModel) return;
    
    // Speed control
    if (this.keys.ArrowUp) {
      this.state.speed = Math.min(this.state.speed + 0.01, this.state.maxSpeed);
    }
    if (this.keys.ArrowDown) {
      this.state.speed = Math.max(this.state.speed - 0.01, this.state.minSpeed);
    }
    
    // Store the previous rotation for wing animation
    this.state.lastRotation = this.condor.rotation.y;
    
    // Left/Right turning
    if (this.keys.ArrowLeft) {
      this.condor.rotation.y += this.state.rotationSpeed;
      // Animate wings for left turn
      this.condorModel.turnLeft();
    }
    if (this.keys.ArrowRight) {
      this.condor.rotation.y -= this.state.rotationSpeed;
      // Animate wings for right turn
      this.condorModel.turnRight();
    }
    
    // Reset wing rotation if not turning
    if (!this.keys.ArrowLeft && !this.keys.ArrowRight) {
      this.condorModel.resetWings();
    }
    
    // Vertical control
    if (this.keys.w) {
      this.state.verticalSpeed = Math.min(this.state.verticalSpeed + 0.005, 0.1);
    } else if (this.keys.s) {
      this.state.verticalSpeed = Math.max(this.state.verticalSpeed - 0.005, -0.1);
    } else {
      // Gradually return to level flight
      this.state.verticalSpeed *= 0.95;
    }
    
    // Update condor pitch based on vertical speed
    this.condorModel.updatePitch(this.state.verticalSpeed);
    
    // Apply movements
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.condor.quaternion);
    direction.multiplyScalar(this.state.speed);
    
    this.condor.position.add(direction);
    this.condor.position.y += this.state.verticalSpeed;
    
    // Get terrain height at condor position
    const terrainHeight = this.terrain.getHeightAtPosition(this.condor.position.x, this.condor.position.z);
    
    // Minimum altitude above terrain
    const minAltitude = terrainHeight + 6;
    if (this.condor.position.y < minAltitude) {
      this.condor.position.y = minAltitude;
      this.state.verticalSpeed = 0;
    }
    
    // Get geographical coordinates
    const geoPosition = this.terrain.worldToGeoPosition(this.condor.position.x, this.condor.position.y, this.condor.position.z);
    
    // Update position
    this.position = {
      lat: geoPosition.lat,
      lng: geoPosition.lng,
      elevation: this.condor.position.y - terrainHeight
    };
    
    return this.position;
  }
  
  // Set the condor model reference - used when condor is created
  setCondorModel(condorModel) {
    this.condorModel = condorModel;
    this.condor = condorModel ? condorModel.getMesh() : null;
  }
  
  // Set the terrain reference - used when terrain is created
  setTerrain(terrain) {
    this.terrain = terrain;
  }
  
  // Get the current position
  getPosition() {
    return this.position;
  }
} 