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
        
        // Disable debug mode as requested
        this.debugMode = false;
        console.log("Debug mode disabled for better gameplay experience");
        
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
            
            // Use a more distant fog for better visibility with infinite terrain
            this.scene.fog = new THREE.Fog(0x87CEEB, 20, 100);
            
            // Set a sky blue background
            this.scene.background = new THREE.Color(0x87CEEB);
            
            // Create the renderer with enhanced settings
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                precision: 'highp' 
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Better performance on high-DPI displays
            this.renderer.outputEncoding = THREE.sRGBEncoding; // Better color accuracy
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better contrast
            this.renderer.toneMappingExposure = 1.0;
            document.body.appendChild(this.renderer.domElement);
            console.log("Enhanced renderer created with improved visual settings");
            
            // Create a temporary camera (will be replaced by player camera)
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 100);
            console.log("Initial camera created with extended far plane for infinite terrain");
            
            // Resize handler
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            // Create physics world
            this.createPhysicsWorld();
            
            // Set up lighting
            this.createLighting();
            
            // Create debug helpers only if debug mode is on
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
            
            // Add sky and environment
            this.createSkyAndEnvironment();
            
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
        
        // Set solver parameters for better terrain interaction
        this.world.solver.iterations = 50;             // Even more iterations for terrain friction accuracy
        this.world.solver.tolerance = 0.0005;          // Tighter tolerance for precision
        
        // More accurate collision detection for proper friction
        this.world.defaultContactMaterial.contactEquationStiffness = 5e8;  // Higher stiffness
        this.world.defaultContactMaterial.contactEquationRelaxation = 3;
        
        // Better friction equation properties for terrain
        this.world.defaultContactMaterial.frictionEquationStiffness = 5e7;  // Increased for better friction
        this.world.defaultContactMaterial.frictionEquationRelaxation = 3;
        
        // Default material properties
        this.world.defaultContactMaterial.friction = 0.6;       // Increased default friction
        this.world.defaultContactMaterial.restitution = 0.5;    // Moderate bounciness
        
        // Use smaller time step for more accurate simulation
        this.world.fixedTimeStep = 1/240;             // Even smaller time step for terrain sensitivity
        
        // Allow more substeps for better stability
        this.world.quatNormalizeFast = false;         // More accurate quaternion normalization
        this.world.quatNormalizeSkip = 0;             // Don't skip normalizations
        
        // Set more accurate broadphase algorithm
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);  // More precise algorithm
        
        // Enable split impulses for better contact resolution (helps with terrain)
        this.world.solver.split = true;  // Better contact stability
        
        // Enable continuous collision detection
        this.world.allowSleep = true;   // Enable sleeping for static terrain
        this.world.sleepTimeLimit = 1.0; // Sleep more quickly for optimization
        this.world.sleepSpeedLimit = 0.1; // Sleep at lower speeds
        
        // Debug physics objects
        this.world.addEventListener('postStep', () => {
            if (this.frameCount % 60 === 0 && this.debugMode) {
                console.log(`Physics world has ${this.world.bodies.length} bodies and ${this.world.constraints.length} constraints`);
                
                // Check terrain interactions for active marble
                if (this.player && this.player.activeMarble) {
                    const body = this.player.activeMarble.body;
                    const vel = body.velocity;
                    const speed = vel.length();
                    
                    // Log useful debug info for terrain interactions
                    console.log(`Marble speed: ${speed.toFixed(3)}, ` +
                               `Position: (${body.position.x.toFixed(2)}, ${body.position.y.toFixed(2)}, ${body.position.z.toFixed(2)}), ` +
                               `Velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)})`);
                    
                    // Check ground contact
                    if (body.position.y < 0.1 && Math.abs(vel.y) < 0.1) {
                        console.log("Marble in ground contact - friction should be applied");
                    }
                }
                
                // Check if any bodies are at positions we don't expect
                for (let i = 0; i < this.world.bodies.length; i++) {
                    const body = this.world.bodies[i];
                    if (isNaN(body.position.x) || isNaN(body.position.y) || isNaN(body.position.z)) {
                        console.error("Body has NaN position:", body);
                    }
                }
            }
        });
        
        console.log("Physics world optimized for realistic terrain interaction and friction");
    }
    
    createLighting() {
        // Ambient light (brighter for better visibility)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Main directional light (simulating sun)
        const dirLight = new THREE.DirectionalLight(0xfffaf3, 1.2); // Warmer sunlight color
        dirLight.position.set(5, 12, 7); // Higher and further away
        dirLight.castShadow = true;
        
        // Wider shadow camera for better coverage of infinite terrain
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 35;
        
        // Higher resolution shadows
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        
        // Better shadow quality
        dirLight.shadow.bias = -0.0001;
        dirLight.shadow.normalBias = 0.02;
        
        this.scene.add(dirLight);
        
        // Add a hemisphere light for better ambient illumination
        const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.5); // Sky color, ground color, intensity
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);
        
        // Add a subtle orange fill light to simulate bounce light from terrain
        const fillLight = new THREE.DirectionalLight(0xffa95c, 0.3);
        fillLight.position.set(-5, 3, -5);
        fillLight.castShadow = false;
        this.scene.add(fillLight);
        
        console.log("Enhanced lighting created with improved colors and shadows");
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
            // This helps with terrain interaction accuracy
            const maxSubSteps = 16;  // Even more substeps for terrain accuracy
            const fixedTimeStep = 1/240;
            
            // Update physics with sub-steps for more accurate simulation
            this.world.step(fixedTimeStep, cappedDelta, maxSubSteps);
            
            // Check collision issues - find all CANNON bodies
            if (this.frameCount % 30 === 0 && this.debugMode) {
                if (this.player && this.player.activeMarble) {
                    // Check for collisions between marble and terrain
                    const marble = this.player.activeMarble.body;
                    const marblePos = marble.position;
                    
                    // Find the closest point on the terrain to the marble
                    if (this.terrain && this.terrain.getHeightAt) {
                        const terrainHeight = this.terrain.getHeightAt(marblePos.x, marblePos.z);
                        const distToTerrain = marblePos.y - terrainHeight;
                        
                        // Sample terrain heights around marble to detect slopes
                        const sampleDist = 0.05; // 5cm sampling distance
                        const forwardX = marblePos.x + marble.velocity.x * 0.2; // Sample in direction of travel
                        const forwardZ = marblePos.z + marble.velocity.z * 0.2;
                        const forwardHeight = this.terrain.getHeightAt(forwardX, forwardZ);
                        
                        // Calculate slope
                        const heightDiff = forwardHeight - terrainHeight;
                        const isUphill = heightDiff > 0.001;
                        
                        // Update debug status
                        const debugStatus = document.getElementById('debug-status');
                        if (debugStatus) {
                            debugStatus.innerHTML = `
                                DEBUG MODE ON<br>
                                Marble: (${marblePos.x.toFixed(2)}, ${marblePos.y.toFixed(2)}, ${marblePos.z.toFixed(2)})<br>
                                Terrain height: ${terrainHeight.toFixed(3)}<br>
                                Distance to terrain: ${distToTerrain.toFixed(3)}<br>
                                Slope: ${heightDiff.toFixed(3)} (${isUphill ? 'Uphill' : 'Downhill'})<br>
                                Velocity: (${marble.velocity.x.toFixed(2)}, ${marble.velocity.y.toFixed(2)}, ${marble.velocity.z.toFixed(2)})<br>
                                Speed: ${marble.velocity.length().toFixed(2)}<br>
                                Bounces: ${this.player.activeMarble.bounceCount || 0}
                            `;
                        }
                        
                        // Additional debug output to console
                        if (distToTerrain < 0.02 && marble.velocity.length() > 0.1) {
                            console.log(`Marble on terrain - Slope: ${heightDiff.toFixed(4)}, Speed: ${marble.velocity.length().toFixed(2)}`);
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
    
    createSkyAndEnvironment() {
        // Create a simple sky dome for better visuals
        const skyGeometry = new THREE.SphereGeometry(90, 32, 32);
        // Flip the geometry inside out
        skyGeometry.scale(-1, 1, 1);
        
        // Create gradient sky material
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `;
        
        const uniforms = {
            topColor: { value: new THREE.Color(0x0077ff) },
            bottomColor: { value: new THREE.Color(0xffffff) },
            offset: { value: 33 },
            exponent: { value: 0.6 }
        };
        
        const skyMaterial = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: uniforms,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        
        // Add distant 3D clouds for visual interest
        this.addDecorations();
        
        console.log("Added sky dome and environmental elements");
    }
    
    addDecorations() {
        // Add distant hills and mountains beyond the infinite terrain
        for (let i = 0; i < 12; i++) {
            const distance = 70 + Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Create a large hill or small mountain
            const radius = 10 + Math.random() * 15;
            const height = 5 + Math.random() * 10;
            
            const hillGeometry = new THREE.ConeGeometry(radius, height, 8);
            const hillMaterial = new THREE.MeshStandardMaterial({
                color: 0x3c2e1c,  // Dark brown
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true
            });
            
            const hill = new THREE.Mesh(hillGeometry, hillMaterial);
            hill.position.set(x, -1, z);
            this.scene.add(hill);
        }
        
        // Add simple cloud puffs
        for (let i = 0; i < 20; i++) {
            const cloudGroup = new THREE.Group();
            
            // Create a cluster of spheres for each cloud
            const puffCount = 3 + Math.floor(Math.random() * 5);
            for (let j = 0; j < puffCount; j++) {
                const puffSize = 5 + Math.random() * 3;
                const geometry = new THREE.SphereGeometry(puffSize, 7, 7);
                const material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.7 + Math.random() * 0.3,
                    roughness: 1.0,
                    metalness: 0.0
                });
                
                const puff = new THREE.Mesh(geometry, material);
                puff.position.set(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 10
                );
                
                cloudGroup.add(puff);
            }
            
            // Position the cloud in the sky
            const cloudDist = 80 + Math.random() * 15;
            const angle = Math.random() * Math.PI * 2;
            cloudGroup.position.set(
                Math.cos(angle) * cloudDist,
                20 + Math.random() * 15,
                Math.sin(angle) * cloudDist
            );
            
            this.scene.add(cloudGroup);
        }
    }
} 