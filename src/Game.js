import * as THREE from 'three';
import Terrain from './Terrain.js';
import Condor from './models/Condor.js';
import CameraController from './camera/CameraController.js';
import FlightControls from './controls/FlightControls.js';
import UIManager from './ui/UIManager.js';
import LandmarksManager from './environment/LandmarksManager.js';
import elevationService from './data/elevationService.js';

export default class Game {
  constructor() {
    // Core ThreeJS components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Game components
    this.terrain = null;
    this.condorModel = null;
    this.cameraController = null;
    this.flightControls = null;
    this.uiManager = null;
    this.landmarksManager = null;
    
    // Initialize the game
    this.init();
  }
  
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0005); // Reduced fog density for better visibility of larger terrain
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 30000);
    this.camera.position.set(0, 200.5, 201.2); // Positioned further back from the condor for a better view
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
    
    // Setup lighting
    this.setupLighting();
    
    // Create UI Manager
    this.uiManager = new UIManager();
    
    // Setup loading manager
    this.setupLoadingManager();
    
    // Initialize the world asynchronously
    this.initWorld();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(300, 1000, 150);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 2000;
    directionalLight.shadow.camera.left = -800;
    directionalLight.shadow.camera.right = 800;
    directionalLight.shadow.camera.top = 800;
    directionalLight.shadow.camera.bottom = -800;
    this.scene.add(directionalLight);
  }
  
  setupLoadingManager() {
    // Loading manager to track progress
    const loadingManager = new THREE.LoadingManager();
    
    loadingManager.onProgress = (url, loaded, total) => {
      const progress = Math.round((loaded / total) * 100);
      this.uiManager.updateLoadingProgress(progress);
    };
    
    loadingManager.onLoad = () => {
      // Remove loading message when all assets are loaded
      this.uiManager.removeLoadingElement();
    };
    
    this.loadingManager = loadingManager;
  }
  
  async initWorld() {
    try {
      // Fetch elevation data from the heightmap image
      const elevationData = await elevationService.fetchElevationData();
      
      // Create terrain
      this.terrain = new Terrain(this.scene);
      this.terrain.heightData = elevationData;
      this.terrain.generateTerrain();
      
      // Create the condor with loading manager
      this.condorModel = new Condor(this.scene, this.loadingManager);
      const condor = this.condorModel.getMesh();
      
      // Create landmarks manager
      this.landmarksManager = new LandmarksManager(this.scene, this.terrain);
      this.landmarksManager.addMajorPeaks(elevationService.MAJOR_PEAKS);
      
      // Create camera controller
      this.cameraController = new CameraController(this.camera, this.renderer, condor);
      
      // Create flight controls
      this.flightControls = new FlightControls(this.condorModel, this.terrain);
      
      // Remove loading element once everything is ready
      // Note: The loading element might be removed by the loading manager already,
      // but we'll keep this as a fallback in case some assets don't use the manager
      setTimeout(() => {
        this.uiManager.removeLoadingElement();
      }, 2000);
      
      // Start animation
      this.animate();
    } catch (error) {
      console.error('Error initializing world:', error);
    }
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    // Update flight controls
    if (this.flightControls) {
      const position = this.flightControls.update();
      if (position) {
        this.uiManager.updateAltitudeDisplay(position);
      }
    }
    
    // Update camera
    if (this.cameraController) {
      this.cameraController.update();
    }
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
} 