// Terrain generation for the marble game

class Terrain {
    constructor(scene, world, size = 5.0, resolution = 64) {
        this.scene = scene;
        this.world = world;
        this.size = size;
        this.resolution = resolution;
        
        // Terrain generation parameters with improved values
        this.circleRadius = 2.5;      // Radius of target circle (1m diameter)
        this.rimWidth = 0.5;          // Width of the rim
        this.rimHeight = 0.05;        // Height of the rim
        this.holeDepth = 0.15;        // Depth of the hole
        this.centerHoleRadius = 0.3;  // 10cm wide center hole (5cm radius)
        this.centerHoleDepth = 0.2;   // 5cm deep center hole
        this.bumpiness = 0.05;        // Increased for better small-scale terrain details (5cm)
        this.smallBumpFrequency = 0.15; // Higher frequency for more micro terrain features
        this.rockDensity = 0.01;      // 5% chance of rocks (increased from 3%)
        this.largeRockCount = 8;      // More rock formations
        this.hillCount = 6;           // More small hills outside the target area
        this.infiniteGridSize = 100;  // Extend background terrain grid this far
        
        // Load textures for shader-based terrain
        console.log("Starting texture loading in constructor...");
        this.loadTerrainTextures();
        
        console.log(`Creating terrain with size ${size}m x ${size}m at resolution ${resolution}x${resolution}`);
        
        // Pre-generate rock and hill positions
        this.rockPositions = [];
        this.hillPositions = [];
        this.generateObstaclePositions();
        
        // Create the terrain
        this.createTerrain();
        
        // Create infinite background terrain
        this.createInfiniteTerrain();
        
        // Create visual indicators with irregular, hand-drawn appearance
        this.createTargetCircle();
        
        // Add visible 3D rocks
        this.createVisibleRocks();
        
        // Texture paths
        this.heightmapPath = 'textures/heightmap.png';
        
        // Generate heightmap if needed
        this.generateHeightmapTexture();
    }
    
    loadTerrainTextures() {
        console.log("Loading terrain textures from files for shader-based material with fallbacks");
        
        // Create a texture loader with cross-origin settings
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous'; // Allow cross-origin loading
        
        // Create more detailed procedural textures for each terrain type
        const createProceduralTexture = (type) => {
            console.log(`Creating procedural ${type} texture as fallback`);
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            
            // Base color based on terrain type
            let baseColor, noiseColors;
            switch(type) {
                case 'dirt':
                    baseColor = '#664422';
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(0, 0, 512, 512);
                    noiseColors = ['#553311', '#775533', '#664422', '#593818'];
                    break;
                case 'sand':
                    baseColor = '#ddccaa';
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(0, 0, 512, 512);
                    noiseColors = ['#ccbb99', '#eeddbb', '#ddccaa', '#cbbb98'];
                    break;
                case 'grass':
                    baseColor = '#669944';
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(0, 0, 512, 512);
                    noiseColors = ['#558833', '#77aa55', '#669944', '#447722'];
                    break;
                case 'rock':
                    baseColor = '#888888';
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(0, 0, 512, 512);
                    noiseColors = ['#666666', '#999999', '#777777', '#555555'];
                    break;
                case 'snow':
                    baseColor = '#ffffff';
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(0, 0, 512, 512);
                    noiseColors = ['#eeeeee', '#ffffff', '#f5f5f5', '#fafafa'];
                    break;
                case 'heightmap':
                    // Gradient for heightmap
                    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
                    gradient.addColorStop(0, '#222222');
                    gradient.addColorStop(0.3, '#666666');
                    gradient.addColorStop(0.7, '#aaaaaa');
                    gradient.addColorStop(1, '#ffffff');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 512, 512);
                    
                    // Add some noise for varied terrain
                    noiseColors = ['#888888', '#aaaaaa', '#666666', '#777777'];
                    break;
                default:
                    baseColor = '#888888';
                    ctx.fillStyle = baseColor;
                    ctx.fillRect(0, 0, 512, 512);
                    noiseColors = ['#666666', '#999999', '#777777', '#aaaaaa'];
            }
            
            // Add noise pattern to make texture look more realistic
            const noiseCount = type === 'heightmap' ? 100000 : 50000;
            const noiseSize = type === 'heightmap' ? 2 : 3;
            
            for (let i = 0; i < noiseCount; i++) {
                const x = Math.floor(Math.random() * 512);
                const y = Math.floor(Math.random() * 512);
                const size = Math.floor(Math.random() * noiseSize) + 1;
                
                // Pick a random color from the noise palette
                ctx.fillStyle = noiseColors[Math.floor(Math.random() * noiseColors.length)];
                ctx.fillRect(x, y, size, size);
            }
            
            // For rock texture, add some crack patterns
            if (type === 'rock') {
                for (let i = 0; i < 10; i++) {
                    const startX = Math.random() * 512;
                    const startY = Math.random() * 512;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    
                    // Create an irregular line
                    let x = startX;
                    let y = startY;
                    for (let j = 0; j < 5; j++) {
                        x += (Math.random() - 0.5) * 100;
                        y += (Math.random() - 0.5) * 100;
                        ctx.lineTo(x, y);
                    }
                    
                    ctx.strokeStyle = '#444444';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            return texture;
        };
        
        // Set up a callback to load texture with fallback
        const loadTexture = (url, textureType) => {
            // Fix the URL path to ensure it's correct for the server
            // For local development server, we need to use direct paths from root
            const baseUrl = './'; // Base URL for local server
            const texturePath = baseUrl + url;
            
            console.log(`Attempting to load texture from: ${texturePath}`);
            
            // Create procedural texture first as immediate fallback
            const proceduralTexture = createProceduralTexture(textureType);
            
            try {
                // Try to load the real texture
                const texture = textureLoader.load(
                    texturePath,
                    (loadedTexture) => {
                        console.log(`Successfully loaded texture: ${url}`);
                        loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
                        
                        // Update the uniform with the loaded texture
                        if (this.uniforms) {
                            const uniformName = 
                                textureType === 'dirt' ? 'oceanTexture' : 
                                textureType === 'sand' ? 'sandyTexture' :
                                textureType === 'grass' ? 'grassTexture' :
                                textureType === 'rock' ? 'rockyTexture' :
                                textureType === 'snow' ? 'snowyTexture' :
                                textureType === 'heightmap' ? 'bumpTexture' : null;
                                
                            if (uniformName && this.uniforms[uniformName]) {
                                console.log(`Updating uniform ${uniformName} with loaded texture`);
                                this.uniforms[uniformName].value = loadedTexture;
                                this.uniforms[uniformName].value.needsUpdate = true;
                            }
                        }
                    },
                    (xhr) => {
                        console.log(`${url}: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                    },
                    (error) => {
                        console.error(`Error loading texture ${url}:`, error);
                        console.log(`Using procedural texture for ${textureType}`);
                    }
                );
                
                // Return procedural texture for immediate use - will be replaced if real texture loads
                return proceduralTexture;
                
            } catch (error) {
                console.error(`Exception loading texture ${url}:`, error);
                return proceduralTexture;
            }
        };
        
        // Load all textures with procedural fallbacks
        console.log("Loading textures with procedural fallbacks");
        const heightmapTexture = loadTexture('textures/heightmap.png', 'heightmap');
        const oceanTexture = loadTexture('textures/dirt-512.jpg', 'dirt');
        const sandyTexture = loadTexture('textures/sand-512.jpg', 'sand');
        const grassTexture = loadTexture('textures/grass-512.jpg', 'grass');
        const rockyTexture = loadTexture('textures/rock-512.jpg', 'rock');
        const snowyTexture = loadTexture('textures/snow-512.jpg', 'snow');
        
        // Create shader uniforms
        this.uniforms = {
            bumpTexture: { value: heightmapTexture },
            bumpScale: { value: 0.2 },
            oceanTexture: { value: oceanTexture },
            sandyTexture: { value: sandyTexture },
            grassTexture: { value: grassTexture },
            rockyTexture: { value: rockyTexture },
            snowyTexture: { value: snowyTexture }
        };
        
        // Set texture repeat values
        this.uniforms.oceanTexture.value.repeat.set(10, 10);
        this.uniforms.sandyTexture.value.repeat.set(10, 10);
        this.uniforms.grassTexture.value.repeat.set(20, 20);
        this.uniforms.rockyTexture.value.repeat.set(20, 20);
        this.uniforms.snowyTexture.value.repeat.set(10, 10);
        
        console.log("Loaded all terrain textures with procedural fallbacks");
        return this.uniforms;
    }
    
    createTerrainVertexShader() {
        return `
            uniform sampler2D bumpTexture;
            uniform float bumpScale;
            
            varying float vAmount;
            varying vec2 vUV;
            
            void main() 
            { 
                vUV = uv;
                
                // Sample the heightmap at this position
                vec4 bumpData = texture2D(bumpTexture, uv);
                
                // Use the red channel as our height value (grayscale)
                // Scale to 0-1 range for consistent texture blending
                vAmount = position.y * 0.1 + 0.5; // Adjust this scaling factor based on your terrain heights
                
                // Use the actual geometry vertex position
                vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * modelViewPosition;
            }
        `;
    }
    
    createTerrainFragmentShader() {
        return `
            uniform sampler2D oceanTexture;
            uniform sampler2D sandyTexture;
            uniform sampler2D grassTexture;
            uniform sampler2D rockyTexture;
            uniform sampler2D snowyTexture;
            
            varying vec2 vUV;
            varying float vAmount;
            
            void main() 
            {
                // Use position.y (normalized) for height-based texture blending
                float height = vAmount;
                
                // Ensure we're using proper texture coordinates
                vec2 uvScaled = vUV;
                
                // Using step functions for cleaner transitions like in the example
                vec4 dirt = (smoothstep(0.01, 0.25, height) - smoothstep(0.30, 0.35, height)) * texture2D(oceanTexture, uvScaled * 10.0);
                vec4 sandy = (smoothstep(0.24, 0.27, height) - smoothstep(0.28, 0.31, height)) * texture2D(sandyTexture, uvScaled * 10.0);
                vec4 grass = (smoothstep(0.28, 0.32, height) - smoothstep(0.35, 0.40, height)) * texture2D(grassTexture, uvScaled * 20.0);
                vec4 rocky = (smoothstep(0.30, 0.50, height) - smoothstep(0.60, 0.70, height)) * texture2D(rockyTexture, uvScaled * 20.0);
                vec4 snowy = (smoothstep(0.65, 0.70, height)) * texture2D(snowyTexture, uvScaled * 10.0);
                
                // Blend all textures together
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0) + dirt + sandy + grass + rocky + snowy;
            }
        `;
    }
    
    // Generate positions for rocks and hills to ensure they don't overlap
    generateObstaclePositions() {
        // Generate larger rock positions (away from the target area)
        for (let i = 0; i < this.largeRockCount; i++) {
            let x, z, distFromCenter;
            let attempt = 0;
            // Keep generating positions until we find one that's not too close to the target
            // and not too close to other rocks
            do {
                attempt++;
                // Random position within the full terrain bounds
                x = Math.random() * this.size - this.size / 2;
                z = Math.random() * this.size - this.size / 2;

                // Calculate distance from center
                distFromCenter = Math.sqrt(x * x + z * z);

                // Check if this position is too close to existing rocks
                let tooClose = false;
                for (const rock of this.rockPositions) {
                    const dx = rock.x - x;
                    const dz = rock.z - z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < 0.5) { // Keep rocks at least 0.5m apart
                        tooClose = true;
                        break;
                    }
                }

                // If it's too close to another rock or too close to center, try again
                // Relaxed condition: require distance from center to be at least 1.2 times circleRadius
                if (tooClose || distFromCenter < this.circleRadius * 1.2) {
                    if (attempt > 100) {
                        console.warn('Could not find valid rock position after 100 attempts, using last values.');
                        break;
                    }
                    continue;
                }

                // Valid position found
                break;

            } while (true);

            // Add rock position with random size
            this.rockPositions.push({
                x: x,
                z: z,
                size: Math.random() * 0.06 + 0.04, // 4-10cm rocks
                height: Math.random() * 0.05 + 0.05 // 5-10cm height
            });
        }
        
        // Generate hill positions (away from the target area and rocks)
        for (let i = 0; i < this.hillCount; i++) {
            let x, z, distFromCenter;
            let attempt = 0;
            // Keep generating positions until we find one that's not too close to the target,
            // and not too close to rocks or other hills
            do {
                attempt++;
                // Random position within the full terrain bounds
                x = Math.random() * this.size - this.size / 2;
                z = Math.random() * this.size - this.size / 2;
                
                // Calculate distance from center
                distFromCenter = Math.sqrt(x * x + z * z);
                
                // Check if this position is too close to existing rocks or hills
                let tooClose = false;
                
                // Check rocks
                for (const rock of this.rockPositions) {
                    const dx = rock.x - x;
                    const dz = rock.z - z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < 0.6) { // Keep hills at least 0.6m from rocks
                        tooClose = true;
                        break;
                    }
                }
                
                // Check hills
                for (const hill of this.hillPositions) {
                    const dx = hill.x - x;
                    const dz = hill.z - z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < 0.8) { // Keep hills at least 0.8m apart from each other
                        tooClose = true;
                        break;
                    }
                }
                
                // If it's too close to another object or too close to center, try again
                // Relaxed condition: require distance from center to be at least 1.3 times circleRadius
                if (tooClose || distFromCenter < this.circleRadius * 1.3) {
                    if (attempt > 100) {
                        console.warn('Could not find valid hill position after 100 attempts, using last values.');
                        break;
                    }
                    continue;
                }
                
                // Valid position found
                break;
                
            } while (true);
            
            // Add hill position with random size
            this.hillPositions.push({
                x: x,
                z: z,
                radius: Math.random() * 0.25 + 0.2, // 20-45cm radius hills
                height: Math.random() * 0.08 + 0.05 // 5-13cm height hills
            });
        }
        
        console.log(`Generated ${this.rockPositions.length} large rocks and ${this.hillPositions.length} hills`);
    }
    
    // Helper function to create realistic noise
    noise(nx, ny) {
        // Simplex-like noise approximation
        return Math.sin(nx * 10) * Math.sin(ny * 10) * 0.5 +
               Math.sin(nx * 20 + 0.3) * Math.sin(ny * 20 + 0.1) * 0.25 +
               Math.sin(nx * 40 + 0.5) * Math.sin(ny * 40 + 0.7) * 0.125;
    }
    
    createTerrain() {
        console.log("Creating terrain with shader-based material...");
        
        // Create the terrain geometry
        this.generateTerrainGeometry();
        
        // Create shader-based material
        this.material = this.createTerrainMaterial();
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(0, 0, 0);
        this.mesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Add physics
        this.createPhysicsGround();
        
        console.log("Terrain created with shader-based textured material");
    }
    
    createTerrainMaterial() {
        // Use the already loaded textures instead of loading them again
        console.log("Creating terrain material with already loaded textures");
        
        try {
            // Verify that uniforms exist
            if (!this.uniforms) {
                console.error("No uniforms found, textures may not have been loaded correctly");
                // Load or create textures for the terrain if they don't exist
                this.uniforms = this.loadTerrainTextures();
            } else {
                console.log("Using existing uniforms with previously loaded textures");
            }
            
            // Create shader material with our vertex and fragment shaders
            const material = new THREE.ShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: this.createTerrainVertexShader(),
                fragmentShader: this.createTerrainFragmentShader(),
                lights: false,
                side: THREE.DoubleSide
            });
            
            console.log("Created shader-based terrain material");
            return material;
        } catch (error) {
            console.error("Error creating shader material:", error);
            
            // Fallback to a basic material if shader fails
            const fallbackMaterial = new THREE.MeshStandardMaterial({
                color: 0x3b2412, // Dark earthy brown
                roughness: 0.8,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            
            console.log("Using fallback material for terrain");
            return fallbackMaterial;
        }
    }
    
    createInfiniteTerrain() {
        // Create a very large ground plane that extends far beyond the play area
        const infiniteGeometry = new THREE.PlaneGeometry(
            this.infiniteGridSize, 
            this.infiniteGridSize, 
            20,  // Lower resolution for background
            20
        );
        
        // Rotate to make it flat on XZ plane
        infiniteGeometry.rotateX(-Math.PI / 2);
        
        // Get vertices to add some natural undulation
        const vertices = infiniteGeometry.attributes.position.array;
        
        // Apply terrain features to each vertex
        for (let i = 0; i < vertices.length; i += 3) {
            // Get XZ coordinates
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Calculate distance from center
            const distFromCenter = Math.sqrt(x * x + z * z);
            
            // Skip the playable area - we already have detailed terrain there
            if (distFromCenter < this.size/2 + 0.5) {
                continue;
            }
            
            // Apply gentle noise for distant terrain
            const largeNoise = this.noise(x/(this.infiniteGridSize*0.2), z/(this.infiniteGridSize*0.2));
            const mediumNoise = this.noise(x/(this.infiniteGridSize*0.1), z/(this.infiniteGridSize*0.1));
            
            // Larger, smoother undulations for distant terrain
            const noiseValue = largeNoise * 0.7 + mediumNoise * 0.3;
            
            // Start with a slight slope away from play area
            let height = 0.05 * (distFromCenter / (this.size/2)) - 0.05;
            
            // Add noise-based terrain
            height += noiseValue * 0.2;
            
            // Add occasional hills in the distance
            if (Math.random() < 0.001) {
                height += 0.2 + Math.random() * 0.3;
            }
            
            // Apply the height
            vertices[i + 1] = height;
        }
        
        // Update geometry
        infiniteGeometry.attributes.position.needsUpdate = true;
        infiniteGeometry.computeVertexNormals();
        
        // Create UVs for the geometry to map textures correctly
        infiniteGeometry.setAttribute(
            'uv',
            new THREE.BufferAttribute(
                new Float32Array(this.generateInfiniteUVs(20)), 
                2
            )
        );
        
        console.log("Creating infinite terrain material...");
        
        // Create uniforms for the infinite terrain - reuse the same textures
        // but with different repeat values
        const infiniteUniforms = {
            bumpTexture: { value: this.uniforms.bumpTexture.value },
            bumpScale: { value: 0.1 },
            oceanTexture: { value: this.uniforms.oceanTexture.value },
            sandyTexture: { value: this.uniforms.sandyTexture.value },
            grassTexture: { value: this.uniforms.grassTexture.value },
            rockyTexture: { value: this.uniforms.rockyTexture.value },
            snowyTexture: { value: this.uniforms.snowyTexture.value }
        };
        
        // Use higher repeat values for the infinite terrain
        infiniteUniforms.oceanTexture.value.repeat.set(40, 40);
        infiniteUniforms.sandyTexture.value.repeat.set(40, 40);
        infiniteUniforms.grassTexture.value.repeat.set(40, 40);
        infiniteUniforms.rockyTexture.value.repeat.set(40, 40);
        infiniteUniforms.snowyTexture.value.repeat.set(40, 40);
        
        // Create a custom shader material for the infinite terrain
        // Reuse the same shaders for consistency
        const infiniteMaterial = new THREE.ShaderMaterial({
            uniforms: infiniteUniforms,
            vertexShader: this.createTerrainVertexShader(),
            fragmentShader: this.createTerrainFragmentShader(),
            side: THREE.DoubleSide
        });
        
        // Create mesh
        this.infiniteMesh = new THREE.Mesh(infiniteGeometry, infiniteMaterial);
        
        // Position it at the same level as the main terrain
        this.infiniteMesh.position.y = -0.05;
        
        // Enable shadows
        this.infiniteMesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(this.infiniteMesh);
        
        console.log("Created infinite terrain background with textured shader material");
    }
    
    generateInfiniteUVs(segments) {
        const uvs = [];
        
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                // Repeat texture many times across the infinite terrain
                const repeatFactor = 40; // Higher for more texture repetition
                uvs.push(j / segments * repeatFactor, i / segments * repeatFactor);
            }
        }
        
        return uvs;
    }
    
    createVisibleRocks() {
        // Create visually distinct rocks to help players see obstacles
        console.log("Creating visible rocks with existing textures or fallbacks...");
        
        // Get the rock texture from the uniforms or create a fallback
        let rockTexture;
        
        // Try to use the existing rock texture
        if (this.uniforms && this.uniforms.rockyTexture && this.uniforms.rockyTexture.value) {
            console.log("Using existing rock texture for visible rocks");
            rockTexture = this.uniforms.rockyTexture.value;
        } else {
            // Create a procedural rock texture as fallback
            console.log("Creating procedural rock texture fallback");
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Fill with base color
            ctx.fillStyle = '#777777';
            ctx.fillRect(0, 0, 128, 128);
            
            // Add some noise/texture
            for (let i = 0; i < 3000; i++) {
                const x = Math.floor(Math.random() * 128);
                const y = Math.floor(Math.random() * 128);
                const size = Math.floor(Math.random() * 3) + 1;
                const brightness = Math.floor(Math.random() * 50) - 25;
                
                const shade = 119 + brightness;
                ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
                ctx.fillRect(x, y, size, size);
            }
            
            // Create a THREE texture from the canvas
            rockTexture = new THREE.CanvasTexture(canvas);
            rockTexture.wrapS = rockTexture.wrapT = THREE.RepeatWrapping;
        }
        
        // Create a simpler shader for rocks
        const rockVertexShader = `
            varying vec2 vUV;
            
            void main() {
                vUV = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const rockFragmentShader = `
            uniform sampler2D rockTexture;
            varying vec2 vUV;
            
            void main() {
                gl_FragColor = texture2D(rockTexture, vUV * 2.0);
            }
        `;
        
        for (const rock of this.rockPositions) {
            // Only visualize larger rocks
            if (rock.size < 0.05) continue;
            
            // Create a rock mesh with more detailed geometry
            const rockGeometry = new THREE.SphereGeometry(rock.size, 10, 8);
            
            // Apply random deformation for more natural rock shape
            const positions = rockGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                // Apply different scales per axis for more natural shapes
                positions[i] *= 0.7 + Math.random() * 0.5; // x (wider variation)
                positions[i + 1] *= 0.8 + Math.random() * 0.4; // y
                positions[i + 2] *= 0.7 + Math.random() * 0.5; // z (wider variation)
                
                // Add small bumps to the rock surface
                const bumpFreq = 5;
                const bumpAmp = 0.15;
                const nx = Math.sin(positions[i] * bumpFreq);
                const ny = Math.sin(positions[i + 1] * bumpFreq);
                const nz = Math.sin(positions[i + 2] * bumpFreq);
                
                positions[i] += nx * bumpAmp * 0.05;
                positions[i + 1] += ny * bumpAmp * 0.05;
                positions[i + 2] += nz * bumpAmp * 0.05;
            }
            
            // Recompute normals
            rockGeometry.computeVertexNormals();
            
            // Create a shader material for the rock
            const rockMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    rockTexture: { value: rockTexture }
                },
                vertexShader: rockVertexShader,
                fragmentShader: rockFragmentShader,
                side: THREE.DoubleSide
            });
            
            // Create mesh
            const rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
            
            // Position rock
            rockMesh.position.set(
                rock.x,
                rock.height / 2 - 0.01, // Embedded slightly in terrain
                rock.z
            );
            
            // Random rotation
            rockMesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            // Enable shadows
            rockMesh.castShadow = true;
            rockMesh.receiveShadow = true;
            
            // Add to scene
            this.scene.add(rockMesh);
        }
        
        console.log("Added visual rock representations with texturing");
    }
    
    // Generate UV coordinates for texture mapping
    generateUVs() {
        const uvs = [];
        const segments = this.resolution - 1;
        
        for (let i = 0; i <= segments; i++) {
            for (let j = 0; j <= segments; j++) {
                // Repeat texture 4 times across the terrain
                uvs.push(j / segments * 4, i / segments * 4);
            }
        }
        
        return uvs;
    }
    
    createPhysicsGround() {
        try {
            console.log("Creating physics ground with enhanced micro-terrain detail...");
            
            // First create a heightfield shape using higher resolution for better detail
            const detailMultiplier = 1.5; // Use higher resolution for physics than visual
            const physicsResolution = Math.min(128, Math.floor(this.resolution * detailMultiplier));
            const elementSize = this.size / (physicsResolution - 1);
            
            // Create a matrix of heights with higher resolution
            const heights = [];
            for (let i = 0; i < physicsResolution; i++) {
                heights[i] = [];
                for (let j = 0; j < physicsResolution; j++) {
                    // Convert high-res indices to world position
                    const x = (j / (physicsResolution - 1) - 0.5) * this.size;
                    const z = (i / (physicsResolution - 1) - 0.5) * this.size;
                    
                    // Calculate a more detailed height value at this position
                    const distFromCenter = Math.sqrt(x * x + z * z);
                    
                    // Start with base height (use higher frequency noise)
                    let height = 0;
                    
                    // Apply multiple layers of noise for soil texture
                    const largeNoise = this.noise(x/this.size, z/this.size);
                    const mediumNoise = this.noise(x/(this.size*0.25), z/(this.size*0.25));
                    const smallNoise = this.noise(x/(this.size*0.1), z/(this.size*0.1));
                    const microNoise = this.noise(x/(this.size*0.02), z/(this.size*0.02));
                    
                    // Combine different noise scales with emphasis on small details
                    const noiseValue = largeNoise * 0.3 + mediumNoise * 0.3 + smallNoise * 0.2 + microNoise * 0.2;
                    
                    // Scale noise by distance from center
                    const bumpScale = Math.min(1.0, distFromCenter / (this.circleRadius + this.rimWidth));
                    height += noiseValue * this.bumpiness * bumpScale;
                    
                    // Add micro-bumps for better physics interaction
                    if (Math.random() < 0.5) {
                        // Micro terrain details slightly larger for physics
                        const microBump = Math.random() * 0.015 + 0.005;
                        height += microBump;
                    }
                    
                    // Add small rocks with higher density for physics
                    if (Math.random() < this.rockDensity * 1.5 && distFromCenter > this.circleRadius + 0.1) {
                        // Small rock or bump (1cm to 3cm)
                        const rockSize = Math.random() * 0.02 + 0.01;
                        height += rockSize;
                    }
                    
                    // Add larger rocks
                    for (const rock of this.rockPositions) {
                        const dx = x - rock.x;
                        const dz = z - rock.z;
                        const distToRock = Math.sqrt(dx * dx + dz * dz);
                        
                        // Make physics rocks slightly larger than visual
                        if (distToRock < rock.size * 1.1) {
                            // Rock profile is half-ellipsoid (steeper slopes)
                            const rockProfile = rock.height * Math.sqrt(1 - (distToRock / (rock.size * 1.1)) * (distToRock / (rock.size * 1.1)));
                            height += rockProfile;
                        }
                    }
                    
                    // Add hills with accurate physics
                    for (const hill of this.hillPositions) {
                        const dx = x - hill.x;
                        const dz = z - hill.z;
                        const distToHill = Math.sqrt(dx * dx + dz * dz);
                        
                        // Make physics hills slightly larger
                        if (distToHill < hill.radius * 1.05) {
                            // Hill profile with cosine function
                            const hillProfile = hill.height * Math.cos((distToHill / (hill.radius * 1.05)) * (Math.PI / 2));
                            height += hillProfile;
                        }
                    }
                    
                    // Inside the center hole
                    if (distFromCenter < this.centerHoleRadius) {
                        // Deeper center
                        const normalizedDist = distFromCenter / this.centerHoleRadius;
                        height = -this.centerHoleDepth * (1 - normalizedDist * normalizedDist);
                    }
                    // Inside the main circle
                    else if (distFromCenter < this.circleRadius) {
                        // Smooth bowl shape with deeper center
                        const normalizedDist = distFromCenter / this.circleRadius;
                        
                        // Add randomness to create irregular hole edge
                        const edgeNoise = this.noise(normalizedDist * 10, normalizedDist * 5) * 0.2;
                        const bowlDepth = this.holeDepth * (1 - Math.pow(normalizedDist, 2 + edgeNoise));
                        
                        // Apply the bowl shape depression
                        height -= bowlDepth;
                        
                        // Add small bumps inside the circle
                        if (distFromCenter > this.centerHoleRadius * 2 && Math.random() < 0.05) {
                            height += Math.random() * 0.012; // Slightly larger bumps for physics
                        }
                    }
                    // On the rim
                    else if (distFromCenter < this.circleRadius + this.rimWidth) {
                        // Create raised rim that smoothly transitions to the terrain
                        const rimPosition = (distFromCenter - this.circleRadius) / this.rimWidth;
                        
                        // Add irregularity to the rim height
                        const rimNoise = this.noise(x * 5, z * 5) * 0.3;
                        const rimProfile = Math.sin(rimPosition * Math.PI) * (1 + rimNoise); 
                        
                        height += this.rimHeight * rimProfile;
                    }
                    
                    heights[i][j] = height;
                }
            }
            
            // Create a backup ground plane for safety
            const groundShape = new CANNON.Plane();
            const groundBody = new CANNON.Body({
                mass: 0, // Static body
                position: new CANNON.Vec3(0, -0.05, 0), // Just below visual terrain
                material: new CANNON.Material('groundMaterial')
            });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2); // Rotate to face up
            
            // Set high friction for the backup ground plane
            groundBody.material.friction = 0.95;
            groundBody.material.restitution = 0.4;
            
            this.world.addBody(groundBody);
            console.log("Added backup ground plane with high friction at y=-0.05");
            
            // Create the heightfield shape for accurate physics
            const heightfieldShape = new CANNON.Heightfield(heights, {
                elementSize: elementSize
            });
            
            // Create the ground body with proper friction and bounce properties
            this.body = new CANNON.Body({
                mass: 0, // Static body
                material: new CANNON.Material('terrainMaterial')
            });
            
            // Position must account for height field centering and higher resolution
            const sizeX = (physicsResolution - 1) * elementSize;
            const sizeZ = (physicsResolution - 1) * elementSize;
            this.body.position.set(-sizeX/2, 0, -sizeZ/2);
            
            // Add the shape
            this.body.addShape(heightfieldShape);
            
            // Use a better material for the terrain - higher friction for small bumps
            this.body.material.friction = 0.95;      // Very high friction to feel small bumps
            this.body.material.restitution = 0.4;    // Lower restitution for natural soil feel
            
            // Set physics parameters to help with micro-terrain interaction
            this.body.linearDamping = 0;            // No damping for static bodies
            this.body.angularDamping = 0;
            this.body.fixedRotation = true;         // No rotation for terrain
            
            // Adjust contact parameters for better stability
            this.body.sleepSpeedLimit = 0;          // Never sleep
            this.body.sleepTimeLimit = 0;           // Never sleep
            
            // Set collision filtering
            this.body.collisionFilterGroup = 1;     // Put in default group
            this.body.collisionFilterMask = -1;     // Collide with everything
            
            // Add to world
            this.world.addBody(this.body);
            
            // Create a contact material between heightfield and default material
            const defaultMaterial = new CANNON.Material('defaultMaterial');
            const contactMaterial = new CANNON.ContactMaterial(
                this.body.material,
                defaultMaterial,
                {
                    friction: 0.9,                   // Higher friction to feel small terrain changes
                    restitution: 0.4,                // Lower restitution for natural soil
                    contactEquationStiffness: 1e9,   // Much stiffer for micro-bump detection
                    contactEquationRelaxation: 4,    // Relaxation for stability
                    frictionEquationStiffness: 1e8,  // Higher for better friction response
                    frictionEquationRelaxation: 4    // Increased for stability
                }
            );
            this.world.addContactMaterial(contactMaterial);
            
            // Add separate physics bodies for terrain features
            this.addTerrainFeatures();
            
            console.log(`Heightfield created at resolution ${physicsResolution}x${physicsResolution} (${heights.length}x${heights[0].length}) for detailed terrain interaction`);
            console.log(`Heightfield element size: ${elementSize}m`);
        } catch (error) {
            console.error("Error creating terrain physics:", error);
        }
    }
    
    addTerrainFeatures() {
        // Add separate physics for rocks (already implemented)
        this.addRockBodies();
        
        // Add physics bodies for hills to enhance terrain interaction
        for (const hill of this.hillPositions) {
            // Create a sphere shape approximating the hill
            // Use slightly smaller collision shape than visual for better gameplay
            const hillShape = new CANNON.Sphere(hill.radius * 0.9);
            
            // Create a static body for the hill
            const hillBody = new CANNON.Body({
                mass: 0, // Static body
                position: new CANNON.Vec3(hill.x, hill.height * 0.5, hill.z),
                material: new CANNON.Material('hillMaterial')
            });
            
            // Add the shape
            hillBody.addShape(hillShape);
            
            // Set hill material properties - very high friction to create natural rolling resistance
            hillBody.material.friction = 0.95;       // Extremely high friction for hills
            hillBody.material.restitution = 0.3;     // Lower restitution for hills (less bouncy)
            
            // Add to world
            this.world.addBody(hillBody);
            
            // Create contact material with marble
            const marbleMaterial = new CANNON.Material('marbleMaterial');
            const hillMarbleContact = new CANNON.ContactMaterial(
                hillBody.material,
                marbleMaterial,
                {
                    friction: 0.95,               // Very high friction to slow marble on hills
                    restitution: 0.3,             // Lower restitution - hills don't bounce much
                    contactEquationStiffness: 5e8, // Higher stiffness for better terrain response
                    contactEquationRelaxation: 3,
                    frictionEquationStiffness: 5e7, // Higher for better friction response
                    frictionEquationRelaxation: 3
                }
            );
            this.world.addContactMaterial(hillMarbleContact);
        }
        
        console.log("Added separate physics bodies for hills to enhance terrain sensitivity");
        
        // Add subtle friction variations to create terrain "zones"
        this.addTerrainFrictionZones();
    }
    
    addTerrainFrictionZones() {
        // Create several invisible friction zones to make the terrain more interesting
        const frictionZones = [
            // Around the target - slightly slippery to make accuracy challenging
            { x: 0, z: 0, radius: 0.8, friction: 0.6, restitution: 0.5, height: 0.01 },
            
            // A few rough patches scattered around
            { x: 1.2, z: -0.8, radius: 0.5, friction: 0.95, restitution: 0.3, height: 0.01 },
            { x: -1.5, z: 1.2, radius: 0.6, friction: 0.9, restitution: 0.4, height: 0.01 },
            { x: -0.7, z: -1.4, radius: 0.4, friction: 0.95, restitution: 0.3, height: 0.01 },
            { x: 0.9, z: 1.6, radius: 0.5, friction: 0.9, restitution: 0.4, height: 0.01 }
        ];
        
        for (const zone of frictionZones) {
            // Create a cylinder for each friction zone
            const zoneShape = new CANNON.Cylinder(zone.radius, zone.radius, zone.height, 12);
            
            // Create body
            const zoneBody = new CANNON.Body({
                mass: 0,
                position: new CANNON.Vec3(zone.x, zone.height/2, zone.z),
                material: new CANNON.Material('frictionZoneMaterial')
            });
            
            // Rotate cylinder to be flat
            const quat = new CANNON.Quaternion();
            quat.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI/2);
            zoneShape.transformAllPoints(new CANNON.Vec3(), quat);
            
            // Add shape
            zoneBody.addShape(zoneShape);
            
            // Set material properties
            zoneBody.material.friction = zone.friction;
            zoneBody.material.restitution = zone.restitution;
            
            // Add to world
            this.world.addBody(zoneBody);
            
            // Create contact material with marble
            const marbleMaterial = new CANNON.Material('marbleMaterial');
            const frictionZoneContact = new CANNON.ContactMaterial(
                zoneBody.material,
                marbleMaterial,
                {
                    friction: zone.friction,
                    restitution: zone.restitution,
                    contactEquationStiffness: 5e8,
                    contactEquationRelaxation: 3
                }
            );
            this.world.addContactMaterial(frictionZoneContact);
        }
        
        console.log("Added terrain friction zones for varied gameplay");
    }
    
    addRockBodies() {
        // Add separate physics bodies for larger rocks to improve collision response
        for (const rock of this.rockPositions) {
            // Only add physics for larger rocks
            if (rock.size < 0.05) continue;
            
            // Create a sphere shape for the rock (slightly larger than visual for better collision)
            const rockShape = new CANNON.Sphere(rock.size * 1.1);
            
            // Create a static body for the rock
            const rockBody = new CANNON.Body({
                mass: 0, // Static body
                position: new CANNON.Vec3(rock.x, rock.height / 2, rock.z),
                material: new CANNON.Material('rockMaterial')
            });
            
            // Add the shape
            rockBody.addShape(rockShape);
            
            // Set rock material properties - very high friction to really stop the marble
            rockBody.material.friction = 0.95;       // Extremely high friction to really affect marble
            rockBody.material.restitution = 0.3;     // Lower restitution than terrain for more "solid" feel
            
            // Add to world
            this.world.addBody(rockBody);
            
            // Create contact material with marble
            const marbleMaterial = new CANNON.Material('marbleMaterial');
            const rockMarbleContact = new CANNON.ContactMaterial(
                rockBody.material,
                marbleMaterial,
                {
                    friction: 0.95,               // Very high friction to stop marble
                    restitution: 0.3,             // Lower restitution - rocks don't bounce as much
                    contactEquationStiffness: 5e8, // Higher stiffness for sharper response
                    contactEquationRelaxation: 3
                }
            );
            this.world.addContactMaterial(rockMarbleContact);
        }
        
        console.log("Added separate physics bodies for rocks with enhanced friction");
    }
    
    createTargetCircle() {
        // Create a hand-drawn looking target area with irregular edges
        
        // 1. Create points for an irregular circle with hand-drawn feel
        const createIrregularCirclePoints = (radius, segments = 64, irregularity = 0.06) => {
            const points = [];
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                
                // Add irregularity to radius based on angle
                const noise = this.noise(Math.cos(angle), Math.sin(angle));
                const r = radius * (1 + noise * irregularity);
                
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                
                points.push(new THREE.Vector3(x, 0.002, z)); // Slightly above terrain
            }
            // Close the loop
            points.push(points[0].clone());
            return points;
        };
        
        // Create the red inner circle (bullseye)
        const innerPoints = createIrregularCirclePoints(0.15, 48, 0.08);
        const innerLineGeometry = new THREE.BufferGeometry().setFromPoints(innerPoints);
        const innerLineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            linewidth: 3,
            linecap: 'round',
            linejoin: 'round'
        });
        const innerLine = new THREE.Line(innerLineGeometry, innerLineMaterial);
        innerLine.position.y = 0.008; // Slightly elevated
        this.scene.add(innerLine);
        
        // Create middle yellow circle
        const middlePoints = createIrregularCirclePoints(0.3, 48, 0.07);
        const middleLineGeometry = new THREE.BufferGeometry().setFromPoints(middlePoints);
        const middleLineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffff00,
            linewidth: 3,
            linecap: 'round',
            linejoin: 'round'
        });
        const middleLine = new THREE.Line(middleLineGeometry, middleLineMaterial);
        middleLine.position.y = 0.007; // Slightly elevated
        this.scene.add(middleLine);
        
        // Create outer blue circle (slightly more irregular)
        const outerPoints = createIrregularCirclePoints(0.45, 48, 0.09);
        const outerLineGeometry = new THREE.BufferGeometry().setFromPoints(outerPoints);
        const outerLineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x0000ff,
            linewidth: 3,
            linecap: 'round',
            linejoin: 'round'
        });
        const outerLine = new THREE.Line(outerLineGeometry, outerLineMaterial);
        outerLine.position.y = 0.006; // Slightly elevated
        this.scene.add(outerLine);
        
        console.log("Target circles created with hand-drawn appearance");
    }
    
    getHeightAt(x, z) {
        // For positions outside the terrain, return 0
        if (Math.abs(x) > this.size / 2 || Math.abs(z) > this.size / 2) {
            return 0;
        }
        
        // Ray casting to find the height
        const raycaster = new THREE.Raycaster();
        const position = new THREE.Vector3(x, 10, z);  // Start the ray high above
        const direction = new THREE.Vector3(0, -1, 0); // Point down
        
        raycaster.set(position, direction);
        
        const intersects = raycaster.intersectObject(this.mesh);
        
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        
        // Fallback - approximate height using distance from center and obstacles
        const distFromCenter = Math.sqrt(x * x + z * z);
        let height = 0;
        
        // Inside the center hole
        if (distFromCenter < this.centerHoleRadius) {
            const normalizedDist = distFromCenter / this.centerHoleRadius;
            height = -this.centerHoleDepth * (1 - normalizedDist * normalizedDist);
        }
        // Inside the circle
        else if (distFromCenter < this.circleRadius) {
            const normalizedDist = distFromCenter / this.circleRadius;
            height = -this.holeDepth * (1 - normalizedDist * normalizedDist);
        }
        // On the rim
        else if (distFromCenter < this.circleRadius + this.rimWidth) {
            const rimPosition = (distFromCenter - this.circleRadius) / this.rimWidth;
            height = this.rimHeight * Math.sin(rimPosition * Math.PI);
        }
        
        // Check for rock height
        for (const rock of this.rockPositions) {
            const dx = x - rock.x;
            const dz = z - rock.z;
            const distToRock = Math.sqrt(dx * dx + dz * dz);
            
            if (distToRock < rock.size) {
                const rockHeight = rock.height * Math.sqrt(1 - (distToRock / rock.size) * (distToRock / rock.size));
                height = Math.max(height, rockHeight); // Take the maximum height
            }
        }
        
        // Check for hill height
        for (const hill of this.hillPositions) {
            const dx = x - hill.x;
            const dz = z - hill.z;
            const distToHill = Math.sqrt(dx * dx + dz * dz);
            
            if (distToHill < hill.radius) {
                const hillHeight = hill.height * Math.cos((distToHill / hill.radius) * (Math.PI / 2));
                height = Math.max(height, hillHeight); // Take the maximum height
            }
        }
        
        return height;
    }
    
    generateTerrainGeometry() {
        // Create a plane geometry with higher resolution for better detail
        this.geometry = new THREE.PlaneGeometry(
            this.size,
            this.size,
            this.resolution - 1,
            this.resolution - 1
        );
        
        // Rotate to make it flat on XZ plane
        this.geometry.rotateX(-Math.PI / 2);
        
        // Use the heightmap to displace vertices in the Y direction
        // First load the heightmap texture
        const textureLoader = new THREE.TextureLoader();
        const heightmapTexture = textureLoader.load('textures/heightmap.png');
        
        // Create a canvas to read the heightmap data
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const img = heightmapTexture.image;
        
        // Function to sample height from heightmap (for vertices)
        const getHeightFromMap = (u, v, heightScale = 0.15) => {
            // Default if we can't sample the heightmap yet
            if (!img || !img.complete) {
                return 0;
            }
            
            // Set canvas size to match image
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw image to canvas
            context.drawImage(img, 0, 0);
            
            // Convert UV coordinates to pixel coordinates
            const x = Math.floor(u * img.width);
            const y = Math.floor(v * img.height);
            
            // Get pixel data (RGBA)
            const pixelData = context.getImageData(x, y, 1, 1).data;
            
            // Use red channel for height (grayscale image)
            const height = pixelData[0] / 255.0;
            
            // Scale the height
            return height * heightScale;
        };
        
        // Get vertices
        const vertices = this.geometry.attributes.position.array;
        const uvs = this.geometry.attributes.uv.array;
        
        // Create the height data for physics
        this.heightData = [];
        
        // Track the highest and lowest points for debugging
        let highestPoint = -Infinity;
        let lowestPoint = Infinity;
        
        // Now apply terrain features - mix heightmap and procedural features
        for (let i = 0, j = 0; i < vertices.length; i += 3, j += 2) {
            // Get XZ coordinates (Y is up in world space, but we rotated the geometry)
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Get UV coordinates
            const u = uvs[j];
            const v = uvs[j + 1];
            
            // Calculate distance from center
            const distFromCenter = Math.sqrt(x * x + z * z);
            
            // Start with heightmap data for base terrain
            let height = getHeightFromMap(u, v);
            
            // Apply multiple layers of noise for additional detail
            const largeNoise = this.noise(x/this.size, z/this.size);
            const mediumNoise = this.noise(x/(this.size*0.5), z/(this.size*0.5));
            const smallNoise = this.noise(x/(this.size*0.2), z/(this.size*0.2));
            const microNoise = this.noise(x/(this.size*0.05), z/(this.size*0.05));
            
            // Combine different noise scales for richer terrain
            const noiseValue = largeNoise * 0.4 + mediumNoise * 0.3 + smallNoise * 0.2 + microNoise * 0.1;
            
            // Add noise-based details
            height += noiseValue * this.bumpiness;
            
            // Add micro-bumps everywhere
            if (Math.random() < this.smallBumpFrequency) {
                const microBump = Math.random() * 0.01 + 0.005;
                height += microBump;
            }
            
            // Add rocks
            if (Math.random() < this.rockDensity && distFromCenter > this.circleRadius + 0.1) {
                const rockSize = Math.random() * 0.02 + 0.01;
                height += rockSize;
            }
            
            // Add larger predefined rocks
            for (const rock of this.rockPositions) {
                const dx = x - rock.x;
                const dz = z - rock.z;
                const distToRock = Math.sqrt(dx * dx + dz * dz);
                
                if (distToRock < rock.size) {
                    const rockProfile = rock.height * Math.sqrt(1 - (distToRock / rock.size) * (distToRock / rock.size));
                    height += rockProfile;
                }
            }
            
            // Add hills
            for (const hill of this.hillPositions) {
                const dx = x - hill.x;
                const dz = z - hill.z;
                const distToHill = Math.sqrt(dx * dx + dz * dz);
                
                if (distToHill < hill.radius) {
                    const hillProfile = hill.height * Math.cos((distToHill / hill.radius) * (Math.PI / 2));
                    height += hillProfile;
                }
            }
            
            // Inside the center hole
            if (distFromCenter < this.centerHoleRadius) {
                const normalizedDist = distFromCenter / this.centerHoleRadius;
                height = -this.centerHoleDepth * (1 - normalizedDist * normalizedDist);
            } 
            // Inside the main circle
            else if (distFromCenter < this.circleRadius) {
                const normalizedDist = distFromCenter / this.circleRadius;
                const edgeNoise = this.noise(normalizedDist * 10, normalizedDist * 5) * 0.2;
                const bowlDepth = this.holeDepth * (1 - Math.pow(normalizedDist, 2 + edgeNoise));
                height -= bowlDepth;
                
                if (distFromCenter > this.centerHoleRadius * 2 && Math.random() < 0.02) {
                    height += Math.random() * 0.01;
                }
            } 
            // On the rim
            else if (distFromCenter < this.circleRadius + this.rimWidth) {
                const rimPosition = (distFromCenter - this.circleRadius) / this.rimWidth;
                const rimNoise = this.noise(x * 5, z * 5) * 0.3;
                const rimProfile = Math.sin(rimPosition * Math.PI) * (1 + rimNoise); 
                height += this.rimHeight * rimProfile;
            }
            
            // Track highest and lowest points
            highestPoint = Math.max(highestPoint, height);
            lowestPoint = Math.min(lowestPoint, height);
            
            // Apply the height
            vertices[i + 1] = height;
            
            // Store for physics
            if (i % 3 === 0) {
                this.heightData.push(height);
            }
        }
        
        // Log terrain height range for debugging
        console.log(`Terrain height range: ${lowestPoint.toFixed(3)}m to ${highestPoint.toFixed(3)}m`);
        
        // Mark the position attribute as needing an update
        this.geometry.attributes.position.needsUpdate = true;
        
        // Update normals
        this.geometry.computeVertexNormals();
        
        console.log("Terrain geometry generated using heightmap with additional procedural features");
    }
    
    // Generate a heightmap texture for terrain displacement
    generateHeightmapTexture() {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const size = 512; // Size of the heightmap
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Fill with black
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, size, size);
        
        // Create noise pattern
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        // Center of the image
        const center = size / 2;
        const maxRadius = Math.min(center, center);
        
        // Generate terrain features
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Normalize coordinates to -1 to 1
                const nx = (x / size - 0.5) * 2;
                const ny = (y / size - 0.5) * 2;
                
                // Distance from center (0 to 1)
                const dist = Math.sqrt(nx * nx + ny * ny);
                const normalizedDist = Math.min(dist, 1.0);
                
                // Base height from distance (higher at center, lower at edges)
                let height = 1.0 - normalizedDist * 0.7;
                
                // Add multiple scales of noise
                const noise1 = this.noise(nx * 2, ny * 2);
                const noise2 = this.noise(nx * 4, ny * 4) * 0.5;
                const noise3 = this.noise(nx * 8, ny * 8) * 0.25;
                
                // Add noise to height
                height += (noise1 + noise2 + noise3) * 0.4;
                
                // Create a crater in the center
                if (dist < 0.5) {
                    const craterDepth = Math.pow((0.5 - dist) * 2, 2) * 0.6;
                    height -= craterDepth;
                    
                    // Add a rim around the crater
                    if (dist > 0.4 && dist < 0.5) {
                        const rimPosition = (dist - 0.4) * 10; // 0 to 1
                        const rimHeight = Math.sin(rimPosition * Math.PI) * 0.3;
                        height += rimHeight;
                    }
                }
                
                // Clamp height to 0-1 range
                height = Math.max(0, Math.min(1, height));
                
                // Convert to grayscale (R=G=B=height)
                const value = Math.floor(height * 255);
                
                // Set pixel data (RGBA)
                const index = (y * size + x) * 4;
                data[index] = value;      // R
                data[index + 1] = value;  // G
                data[index + 2] = value;  // B
                data[index + 3] = 255;    // A (full opacity)
            }
        }
        
        // Put the new image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert canvas to blob and download
        if (typeof canvas.toBlob === 'function') {
            canvas.toBlob((blob) => {
                // Create a link element to download the blob
                const link = document.createElement('a');
                link.download = 'heightmap.png';
                link.href = URL.createObjectURL(blob);
                link.textContent = 'Download Heightmap';
                
                // Append to body to make it clickable
                document.body.appendChild(link);
                
                // Make it visible for user
                link.style.position = 'fixed';
                link.style.top = '10px';
                link.style.right = '10px';
                link.style.padding = '10px';
                link.style.backgroundColor = '#444';
                link.style.color = 'white';
                link.style.textDecoration = 'none';
                link.style.borderRadius = '5px';
                link.style.zIndex = '9999';
                
                console.log("Heightmap generated. Click the 'Download Heightmap' button to save it.");
            });
        } else {
            console.error("Canvas toBlob not supported by browser");
        }
        
        // Save the canvas to an in-memory image
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        
        return img;
    }
} 