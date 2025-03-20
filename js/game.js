// Main game class that manages the 3D scene, physics, and game logic

// Helper function for random number generation
function random(min, max) {
    return Math.random() * (max - min) + min;
}

class Game {
    constructor() {
        console.log("Game constructor called");
        
        // Debug info about available libraries
        console.log("THREE object is available");
        console.log("CANNON object is available");
        
        // Enable debug mode for physics troubleshooting
        this.debugMode = true;
        console.log("Debug mode enabled for physics troubleshooting");
        
        // Initialize properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrain = null;
        this.player = null;
        this.world = null;
        this.lastFrameTime = null;
        this.frameCount = 0;
        
        // Physics debug properties
        this.cannonDebugRenderer = null;
        
        // Initialize the game
        this.init();
    }
    
    init() {
        try {
            console.log("Game init started");
            
            // Create the scene
            this.scene = new THREE.Scene();
            console.log("Scene created");
            
            // Use a more distant fog for better visibility
            this.scene.fog = new THREE.Fog(0x87CEEB, 10, 30);
            
            // Set a sky blue background
            this.scene.background = new THREE.Color(0x87CEEB);
            
            // Create the renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            document.body.appendChild(this.renderer.domElement);
            console.log("Renderer created and added to DOM");
            
            // Create a temporary camera (will be replaced by player camera)
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 30);
            console.log("Initial camera created");
            
            // Resize handler
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            // Create physics world
            this.createPhysicsWorld();
            
            // Set up lighting
            this.createLighting();
            
            // Create debug helpers
            if (this.debugMode) {
                this.setupDebugHelpers();
            }
            
            try {
                // Create the terrain
                console.log("Creating terrain...");
                this.terrain = new Terrain(this.scene, this.world, 5.0, 64);
                console.log("Terrain created successfully");
                
                // Create the player (which creates its own camera)
                console.log("Creating player...");
                this.player = new Player(this.scene, this.world, this.terrain);
                console.log("Player created successfully");
                
                // Use the player's camera
                this.camera = this.player.camera;
                console.log("Using player camera");
            } catch (error) {
                console.error("Error creating game objects:", error);
                // Create a visible error message in the scene
                this.createErrorText("Error: " + error.message);
                return;
            }
            
            // Create UI
            this.createUI();
            
            // Add ground check point for debugging
            if (this.debugMode) {
                this.addGroundCheckPoint();
            }
            
            console.log("Game initialized successfully");
            
            // Start the game loop
            this.lastFrameTime = performance.now();
            this.gameLoop();
            
        } catch (error) {
            console.error("Fatal error initializing game:", error);
            this.createErrorText("Fatal error: " + error.message);
        }
    }
    
    setupDebugHelpers() {
        // Create visual helpers for debugging
        
        // 1. Add a grid helper for reference
        const gridHelper = new THREE.GridHelper(10, 20, 0x000000, 0x444444);
        this.scene.add(gridHelper);
        console.log("Grid helper added for debugging");
        
        // 2. Create CANNON.js debugger if available
        try {
            // Check if CannonDebugRenderer exists (it should be included separately)
            if (typeof CannonDebugRenderer !== 'undefined') {
                this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world);
                console.log("CANNON debug renderer initialized for visualizing physics");
            } else {
                console.log("CANNON debug renderer not available - include the script to see physics bodies");
            }
        } catch (error) {
            console.warn("CANNON debug renderer creation failed:", error);
        }
        
        // 3. Add a coordinate axis helper
        const axesHelper = new THREE.AxesHelper(1);
        this.scene.add(axesHelper);
        console.log("Axes helper added for orientation reference");
    }
    
    addGroundCheckPoint() {
        // Add a visible point at y=0 to check terrain alignment
        const geometry = new THREE.SphereGeometry(0.05, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(0, 0, 0);
        this.scene.add(marker);
        console.log("Ground check point added at origin (0,0,0)");
    }
    
    createErrorText(message) {
        // Display error message in the DOM
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '10px';
        errorDiv.style.left = '10px';
        errorDiv.style.backgroundColor = 'rgba(255,0,0,0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.fontFamily = 'Arial, sans-serif';
        errorDiv.style.zIndex = '1000';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }
    
    createPhysicsWorld() {
        // Set up physics world with realistic gravity
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        
        // Set solver parameters for better bounce behavior
        this.world.solver.iterations = 30;             // More iterations for accuracy
        this.world.solver.tolerance = 0.001;           // Tighter tolerance
        
        // More accurate collision detection for proper bouncing
        this.world.defaultContactMaterial.contactEquationStiffness = 1e8;
        this.world.defaultContactMaterial.contactEquationRelaxation = 3;
        
        // Default material properties
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.9;    // Higher default bounciness
        
        // Use smaller time step for more accurate simulation
        this.world.fixedTimeStep = 1/180;             // Even smaller time step for bounce accuracy
        
        // Allow more substeps for better stability
        this.world.quatNormalizeFast = false;         // More accurate quaternion normalization
        this.world.quatNormalizeSkip = 0;             // Don't skip normalizations
        
        // Set broadphase algorithm
        this.world.broadphase = new CANNON.NaiveBroadphase();
        
        // Enable continuous collision detection
        this.world.allowSleep = false;
        
        // Debug physics objects
        this.world.addEventListener('postStep', () => {
            if (this.frameCount % 60 === 0 && this.debugMode) {
                console.log(`Physics world has ${this.world.bodies.length} bodies and ${this.world.constraints.length} constraints`);
                
                // Check if any bodies are at positions we don't expect
                for (let i = 0; i < this.world.bodies.length; i++) {
                    const body = this.world.bodies[i];
                    if (isNaN(body.position.x) || isNaN(body.position.y) || isNaN(body.position.z)) {
                        console.error("Body has NaN position:", body);
                    }
                }
            }
        });
        
        console.log("Physics world optimized for realistic bouncing behavior");
    }
    
    createLighting() {
        // Ambient light (brighter for better visibility)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light (simulating sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 5); // Higher and further away
        dirLight.castShadow = true;
        
        // Wider shadow camera for better coverage
        dirLight.shadow.camera.left = -10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = -10;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 30;
        
        // Higher resolution shadows
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        
        // Better shadow quality
        dirLight.shadow.bias = -0.0001;
        
        this.scene.add(dirLight);
        
        // Add a hemisphere light for better ambient illumination
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
        
        console.log("Lighting created");
    }
    
    createUI() {
        // Create a container for the UI
        const uiContainer = document.createElement('div');
        uiContainer.style.position = 'absolute';
        uiContainer.style.bottom = '20px';
        uiContainer.style.left = '50%';
        uiContainer.style.transform = 'translateX(-50%)';
        uiContainer.style.textAlign = 'center';
        uiContainer.style.fontFamily = 'Arial, sans-serif';
        uiContainer.style.color = 'white';
        uiContainer.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        
        // Create a display for the remaining marbles
        const marblesDisplay = document.createElement('div');
        marblesDisplay.id = 'marbles-display';
        marblesDisplay.textContent = 'Marbles: 5';
        marblesDisplay.style.fontSize = '18px';
        marblesDisplay.style.marginBottom = '10px';
        
        // Create a label for the power meter
        const powerLabel = document.createElement('div');
        powerLabel.textContent = 'Throw Power:';
        powerLabel.style.fontSize = '14px';
        powerLabel.style.marginBottom = '5px';
        
        // Create the power meter container
        const powerMeter = document.createElement('div');
        powerMeter.style.width = '200px';
        powerMeter.style.height = '15px';
        powerMeter.style.border = '2px solid white';
        powerMeter.style.borderRadius = '10px';
        powerMeter.style.overflow = 'hidden';
        
        // Create the power level indicator
        const powerLevel = document.createElement('div');
        powerLevel.id = 'power-level';
        powerLevel.style.width = '0%';
        powerLevel.style.height = '100%';
        powerLevel.style.backgroundColor = 'green';
        powerLevel.style.transition = 'width 0.1s, background-color 0.2s';
        
        // Create a UI panel for game stats
        const statPanel = document.createElement('div');
        statPanel.style.position = 'absolute';
        statPanel.style.top = '10px';
        statPanel.style.left = '10px';
        statPanel.style.backgroundColor = 'rgba(0,0,0,0.5)';
        statPanel.style.padding = '10px';
        statPanel.style.borderRadius = '5px';
        statPanel.style.color = 'white';
        statPanel.style.fontFamily = 'Arial, sans-serif';
        statPanel.style.fontSize = '14px';
        
        // Create stats elements
        const scoreInfo = document.createElement('div');
        scoreInfo.id = 'score-info';
        scoreInfo.textContent = 'Score: 0';
        scoreInfo.style.marginBottom = '5px';
        scoreInfo.style.fontWeight = 'bold';
        scoreInfo.style.fontSize = '16px';
        
        const distanceInfo = document.createElement('div');
        distanceInfo.id = 'distance-info';
        distanceInfo.textContent = 'Distance to target: -';
        distanceInfo.style.marginBottom = '5px';
        
        const bounceInfo = document.createElement('div');
        bounceInfo.id = 'bounce-info';
        bounceInfo.textContent = 'Bounces: 0';
        bounceInfo.style.marginBottom = '5px';
        
        const obstacleInfo = document.createElement('div');
        obstacleInfo.id = 'obstacle-info';
        obstacleInfo.textContent = 'Obstacle hits: 0';
        obstacleInfo.style.marginBottom = '5px';
        
        const powerInfo = document.createElement('div');
        powerInfo.id = 'power-info';
        powerInfo.textContent = 'Power: 0%';
        
        // Add elements to the stats panel
        statPanel.appendChild(scoreInfo);
        statPanel.appendChild(distanceInfo);
        statPanel.appendChild(bounceInfo);
        statPanel.appendChild(obstacleInfo);
        statPanel.appendChild(powerInfo);
        
        // Create game controls info
        const controlsInfo = document.createElement('div');
        controlsInfo.style.marginTop = '20px';
        controlsInfo.style.fontSize = '14px';
        controlsInfo.innerHTML = `
            Controls: <br>
            ← → or A/D: Move around <br>
            ↑ ↓ or W/S: Adjust camera height <br>
            SPACE: Hold to charge, release to throw
        `;
        
        // Add debug status if in debug mode
        if (this.debugMode) {
            const debugStatus = document.createElement('div');
            debugStatus.style.position = 'absolute';
            debugStatus.style.top = '10px';
            debugStatus.style.right = '10px';
            debugStatus.style.backgroundColor = 'rgba(0,0,0,0.5)';
            debugStatus.style.color = 'white';
            debugStatus.style.padding = '5px';
            debugStatus.style.fontSize = '12px';
            debugStatus.id = 'debug-status';
            debugStatus.innerHTML = 'DEBUG MODE ON';
            document.body.appendChild(debugStatus);
        }
        
        // Add all elements to the DOM
        powerMeter.appendChild(powerLevel);
        uiContainer.appendChild(marblesDisplay);
        uiContainer.appendChild(powerLabel);
        uiContainer.appendChild(powerMeter);
        uiContainer.appendChild(controlsInfo);
        document.body.appendChild(uiContainer);
        document.body.appendChild(statPanel);
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    update(deltaTime) {
        try {
            // Cap maximum delta time to avoid major physics jumps
            const cappedDelta = Math.min(deltaTime, 1/30);
            
            // Use multiple substeps for better physics stability
            // This helps with bounce accuracy
            const maxSubSteps = 10;  // More substeps for accuracy
            const fixedTimeStep = 1/180;
            
            // Update physics with sub-steps for more accurate simulation
            this.world.step(fixedTimeStep, cappedDelta, maxSubSteps);
            
            // Check collision issues - find all CANNON bodies
            if (this.frameCount % 60 === 0 && this.debugMode) {
                if (this.player && this.player.activeMarble) {
                    // Check for collisions between marble and terrain
                    const marble = this.player.activeMarble.body;
                    const marblePos = marble.position;
                    
                    // Find the closest point on the terrain to the marble
                    if (this.terrain && this.terrain.getHeightAt) {
                        const terrainHeight = this.terrain.getHeightAt(marblePos.x, marblePos.z);
                        const distToTerrain = marblePos.y - terrainHeight;
                        
                        // Update debug status
                        const debugStatus = document.getElementById('debug-status');
                        if (debugStatus) {
                            debugStatus.innerHTML = `
                                DEBUG MODE ON<br>
                                Marble: (${marblePos.x.toFixed(2)}, ${marblePos.y.toFixed(2)}, ${marblePos.z.toFixed(2)})<br>
                                Terrain height: ${terrainHeight.toFixed(3)}<br>
                                Distance to terrain: ${distToTerrain.toFixed(3)}<br>
                                Velocity: (${marble.velocity.y.toFixed(2)})<br>
                                Bounces: ${this.player.activeMarble.bounceCount || 0}
                            `;
                        }
                        
                        if (distToTerrain < 0.01 && marble.velocity.y < 0) {
                            console.log("Marble near terrain but not bouncing. Forcing upward velocity for debugging.");
                            // Force a small upward velocity to see if physics is working
                            if (this.debugMode && this.frameCount % 300 === 0) {
                                marble.velocity.y = 1.0;
                            }
                        }
                    }
                    
                    // Check if marble is moving upward
                    const vel = marble.velocity;
                    if (vel.y > 0.1) {
                        console.log("Upward velocity detected:", 
                            vel.x.toFixed(2), 
                            vel.y.toFixed(2), 
                            vel.z.toFixed(2)
                        );
                    }
                }
            }
            
            // Update player
            if (this.player) {
                this.player.update(cappedDelta);
                
                // Update UI
                const marblesDisplay = document.getElementById('marbles-display');
                if (marblesDisplay && this.player.remainingMarbles !== undefined) {
                    marblesDisplay.textContent = `Marbles: ${this.player.remainingMarbles}`;
                }
            }
            
            // Update physics debug renderer if available
            if (this.cannonDebugRenderer) {
                this.cannonDebugRenderer.update();
            }
            
            // Increment frame counter
            this.frameCount++;
            
        } catch (error) {
            console.error("Error in game update:", error);
        }
    }
    
    gameLoop() {
        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
        
        try {
            // Calculate delta time
            const now = performance.now();
            const deltaTime = (now - this.lastFrameTime) / 1000; // Convert to seconds
            this.lastFrameTime = now;
            
            // Update game state
            this.update(deltaTime);
            
            // Render the scene
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error("Error in game loop:", error);
        }
    }
} 