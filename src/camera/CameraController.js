import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default class CameraController {
  constructor(camera, renderer, condor) {
    this.camera = camera;
    this.renderer = renderer;
    this.condor = condor;
    this.controls = null;
    this.isMouseDown = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;
    
    // Camera control state
    this.state = {
      enableMouseControl: true,
      rotationSensitivity: 0.002,
      defaultOffset: new THREE.Vector3(0, 0.5, 1.2), // Moved camera back to see more of the condor
      freeCamera: false // New state to toggle between follow mode and free camera mode
    };
    
    // Initialize controls
    this.initControls();
    this.setupEventListeners();
  }
  
  initControls() {
    // Initialize orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 1.2; // Allow more angle to see underneath
    this.controls.minDistance = 0.1; // Allow getting very close to the condor
    this.controls.maxDistance = 10; // Limit how far you can zoom out
    
    // Disable controls by default (will be enabled in free camera mode)
    this.controls.enabled = false;
  }
  
  setupEventListeners() {
    // Mouse control
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Touch controls for mobile
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
    
    // Toggle camera control with 'C' key
    // Toggle free camera mode with 'F' key
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  
  onMouseDown(e) {
    if (!this.state.freeCamera) {
      this.isMouseDown = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }
  }
  
  onMouseUp() {
    this.isMouseDown = false;
  }
  
  onMouseLeave() {
    this.isMouseDown = false;
  }
  
  onMouseMove(e) {
    if (this.isMouseDown && this.state.enableMouseControl && !this.state.freeCamera && this.condor) {
      const deltaX = e.clientX - this.prevMouseX;
      
      // Rotate the condor based on mouse movement
      this.condor.rotation.y -= deltaX * this.state.rotationSensitivity;
      
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }
  }
  
  onTouchStart(e) {
    if (!this.state.freeCamera && e.touches.length === 1) {
      this.isMouseDown = true;
      this.prevMouseX = e.touches[0].clientX;
      this.prevMouseY = e.touches[0].clientY;
    }
  }
  
  onTouchEnd() {
    this.isMouseDown = false;
  }
  
  onTouchMove(e) {
    if (this.isMouseDown && this.state.enableMouseControl && !this.state.freeCamera && e.touches.length === 1 && this.condor) {
      const deltaX = e.touches[0].clientX - this.prevMouseX;
      
      // Rotate the condor based on touch movement
      this.condor.rotation.y -= deltaX * this.state.rotationSensitivity;
      
      this.prevMouseX = e.touches[0].clientX;
      this.prevMouseY = e.touches[0].clientY;
    }
  }
  
  onKeyDown(e) {
    // Toggle camera control mode with 'C' key
    if (e.key === 'c' || e.key === 'C') {
      this.state.enableMouseControl = !this.state.enableMouseControl;
    }
    
    // Toggle free camera mode with 'F' key
    if (e.key === 'f' || e.key === 'F') {
      this.state.freeCamera = !this.state.freeCamera;
      
      // When switching to free camera mode, set the orbit controls target to the condor
      if (this.state.freeCamera && this.condor) {
        this.controls.target.copy(this.condor.position);
        this.controls.enabled = true;
        
        // Display controls help message
        this.showControlsHelp();
      } else {
        this.controls.enabled = false;
        
        // Hide help message when switching back to follow mode
        this.hideControlsHelp();
      }
    }
  }
  
  showControlsHelp() {
    // Create or show help message
    if (!this.helpElement) {
      this.helpElement = document.createElement('div');
      this.helpElement.style.position = 'absolute';
      this.helpElement.style.bottom = '20px';
      this.helpElement.style.left = '20px';
      this.helpElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      this.helpElement.style.color = 'white';
      this.helpElement.style.padding = '10px';
      this.helpElement.style.borderRadius = '5px';
      this.helpElement.style.fontFamily = 'Arial, sans-serif';
      this.helpElement.innerHTML = `
        <p>Free camera mode enabled</p>
        <p>- Left click + drag: Rotate camera</p>
        <p>- Right click + drag: Pan camera</p>
        <p>- Scroll: Zoom in/out</p>
        <p>- Press F to return to follow mode</p>
      `;
      document.body.appendChild(this.helpElement);
    } else {
      this.helpElement.style.display = 'block';
    }
  }
  
  hideControlsHelp() {
    if (this.helpElement) {
      this.helpElement.style.display = 'none';
    }
  }
  
  // Update camera position to follow the condor
  update() {
    if (!this.condor) return;
    
    // If in free camera mode, let OrbitControls handle the camera
    if (this.state.freeCamera) {
      // Update orbit controls target to follow the condor position
      this.controls.target.copy(this.condor.position);
      this.controls.update();
      return;
    }
    
    // In follow mode, position the camera behind the condor
    // Disable OrbitControls when using camera control
    this.controls.enabled = false;
    
    // Position the camera behind and slightly above the condor
    const cameraOffset = this.state.defaultOffset.clone();
    
    // Apply the condor's rotation to the camera offset
    // This will make the camera follow the condor's orientation in all axes
    cameraOffset.applyQuaternion(this.condor.quaternion);
    
    // Adjust the camera position to follow the condor
    this.camera.position.copy(this.condor.position).add(cameraOffset);
    
    // Make the camera look at the condor
    // Calculate a look-ahead point based on condor's forward direction
    const lookAheadDistance = 0.5; // Minimal look-ahead distance for very close view
    const lookAheadPoint = this.condor.position.clone();
    
    // Create a vector pointing in the direction the condor is facing
    // The condor now naturally faces negative Z direction without extra rotation
    const forwardVector = new THREE.Vector3(0, 0, -0.5);
    forwardVector.applyQuaternion(this.condor.quaternion);
    
    // Add this to the condor's position to get a point ahead of the condor
    lookAheadPoint.add(forwardVector);
    
    // Look at this point instead of directly at the condor
    this.camera.lookAt(lookAheadPoint);
  }
  
  // Set the condor reference - used when condor is created
  setCondor(condor) {
    this.condor = condor;
  }
} 