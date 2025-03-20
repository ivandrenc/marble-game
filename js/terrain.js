// Terrain generation for the marble game

class Terrain {
    constructor(scene, world, size = 5.0, resolution = 64) {
        this.scene = scene;
        this.world = world;
        this.size = size;
        this.resolution = resolution;
        
        // Terrain generation parameters with improved values
        this.circleRadius = 0.5;      // Radius of target circle (1m diameter)
        this.rimWidth = 0.2;          // Width of the rim
        this.rimHeight = 0.12;        // Height of the rim
        this.holeDepth = 0.15;        // Depth of the hole
        this.centerHoleRadius = 0.05; // 10cm wide center hole (5cm radius)
        this.centerHoleDepth = 0.05;  // 5cm deep center hole
        this.bumpiness = 0.03;        // Increased small rocks and soil unevenness (3cm)
        this.rockDensity = 0.03;      // 3% chance of rocks (increased from 2%)
        this.largeRockCount = 6;      // Number of larger rock formations
        this.hillCount = 4;           // Number of small hills outside the target area
        
        console.log(`Creating terrain with size ${size}m x ${size}m at resolution ${resolution}x${resolution}`);
        
        // Pre-generate rock and hill positions
        this.rockPositions = [];
        this.hillPositions = [];
        this.generateObstaclePositions();
        
        // Create the terrain
        this.createTerrain();
        
        // Create visual indicators with irregular, hand-drawn appearance
        this.createTargetCircle();
        
        // Add visible 3D rocks
        this.createVisibleRocks();
    }
    
    // Generate positions for rocks and hills to ensure they don't overlap
    generateObstaclePositions() {
        // Generate larger rock positions (away from the target area)
        for (let i = 0; i < this.largeRockCount; i++) {
            let x, z, distFromCenter;
            
            // Keep generating positions until we find one that's not too close to the target
            // and not too close to other rocks
            do {
                // Random position within the terrain bounds
                x = (Math.random() * 0.8 + 0.1) * this.size - this.size / 2;
                z = (Math.random() * 0.8 + 0.1) * this.size - this.size / 2;
                
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
                if (tooClose || distFromCenter < this.circleRadius + this.rimWidth + 0.3) {
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
            
            // Keep generating positions until we find one that's not too close to the target
            // and not too close to rocks or other hills
            do {
                // Random position within the terrain bounds
                x = (Math.random() * 0.8 + 0.1) * this.size - this.size / 2;
                z = (Math.random() * 0.8 + 0.1) * this.size - this.size / 2;
                
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
                if (tooClose || distFromCenter < this.circleRadius + this.rimWidth + 0.5) {
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
        // Create a plane geometry with higher resolution for better detail
        this.geometry = new THREE.PlaneGeometry(
            this.size,
            this.size,
            this.resolution - 1,
            this.resolution - 1
        );
        
        // Rotate to make it flat on XZ plane
        this.geometry.rotateX(-Math.PI / 2);
        
        // Get vertices
        const vertices = this.geometry.attributes.position.array;
        
        // Create the height data for physics
        this.heightData = [];
        
        // Track the highest and lowest points for debugging
        let highestPoint = -Infinity;
        let lowestPoint = Infinity;
        
        // Apply terrain features to each vertex
        for (let i = 0; i < vertices.length; i += 3) {
            // Get XZ coordinates (Y is up in world space, but we rotated the geometry)
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Calculate distance from center
            const distFromCenter = Math.sqrt(x * x + z * z);
            
            // Default height
            let height = 0;
            
            // Apply perlin-like noise for soil texture and small rocks
            // Use consistent noise pattern based on position
            const noiseValue = this.noise(x/this.size, z/this.size);
            
            // Scale noise by distance from center (more bumpy further from center)
            const bumpScale = Math.min(1.0, distFromCenter / (this.circleRadius + this.rimWidth));
            height += noiseValue * this.bumpiness * bumpScale;
            
            // Create small random rocks and soil bumps (increased density)
            if (Math.random() < this.rockDensity && distFromCenter > this.circleRadius + 0.1) {
                // Small rock or bump
                const rockSize = Math.random() * 0.025 + 0.008; // 0.8cm to 3.3cm
                height += rockSize;
            }
            
            // Add larger predefined rocks
            for (const rock of this.rockPositions) {
                const dx = x - rock.x;
                const dz = z - rock.z;
                const distToRock = Math.sqrt(dx * dx + dz * dz);
                
                // If within rock radius, add height based on distance (bell curve)
                if (distToRock < rock.size) {
                    // Rock profile is half-ellipsoid (steeper slopes)
                    const rockProfile = rock.height * Math.sqrt(1 - (distToRock / rock.size) * (distToRock / rock.size));
                    height += rockProfile;
                }
            }
            
            // Add hills (smoother and larger than rocks)
            for (const hill of this.hillPositions) {
                const dx = x - hill.x;
                const dz = z - hill.z;
                const distToHill = Math.sqrt(dx * dx + dz * dz);
                
                // If within hill radius, add height based on distance (bell curve)
                if (distToHill < hill.radius) {
                    // Hill profile is a cosine function (smooth transition)
                    const hillProfile = hill.height * Math.cos((distToHill / hill.radius) * (Math.PI / 2));
                    height += hillProfile;
                }
            }
            
            // Inside the center hole (create a shallow depression)
            if (distFromCenter < this.centerHoleRadius) {
                // Deeper center
                const normalizedDist = distFromCenter / this.centerHoleRadius;
                height = -this.centerHoleDepth * (1 - normalizedDist * normalizedDist);
            }
            // Inside the main circle (create a smooth depression)
            else if (distFromCenter < this.circleRadius) {
                // Smooth bowl shape with deeper center but irregular surface
                const normalizedDist = distFromCenter / this.circleRadius;
                
                // Add randomness to create irregular hole edge
                const edgeNoise = this.noise(normalizedDist * 10, normalizedDist * 5) * 0.2;
                const bowlDepth = this.holeDepth * (1 - Math.pow(normalizedDist, 2 + edgeNoise));
                
                // Apply the bowl shape depression
                height -= bowlDepth;
                
                // Add small bumps inside the circle for more realistic soil
                if (distFromCenter > this.centerHoleRadius * 2 && Math.random() < 0.01) {
                    height += Math.random() * 0.01; // Small 1cm bumps
                }
            }
            // On the rim (raised edge with organic variation)
            else if (distFromCenter < this.circleRadius + this.rimWidth) {
                // Create raised rim that smoothly transitions to the terrain
                const rimPosition = (distFromCenter - this.circleRadius) / this.rimWidth;
                
                // Add irregularity to the rim height
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
        
        // Create main material that looks like soil/dirt
        this.material = new THREE.MeshStandardMaterial({
            color: 0x553311,          // Brown soil color
            roughness: 0.95,          // Very rough for soil
            metalness: 0.0,           // No metal properties
            side: THREE.DoubleSide,   // Render both sides
            flatShading: false        // Smooth shading
        });
        
        // Create meshes
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Create UVs for the geometry to map textures correctly
        this.geometry.setAttribute(
            'uv',
            new THREE.BufferAttribute(
                new Float32Array(this.generateUVs()), 
                2
            )
        );
        
        // Enable shadows (critical for visibility)
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        
        // Add terrain mesh to scene
        this.scene.add(this.mesh);
        
        console.log("Terrain geometry created with soil appearance, small rocks, and hills");
        
        // Create physics ground
        this.createPhysicsGround();
    }
    
    createVisibleRocks() {
        // Create visually distinct rocks to help players see obstacles
        for (const rock of this.rockPositions) {
            // Only visualize larger rocks
            if (rock.size < 0.05) continue;
            
            // Create a rock mesh
            const rockGeometry = new THREE.SphereGeometry(rock.size, 8, 6);
            
            // Apply random deformation for more natural rock shape
            const positions = rockGeometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] *= 0.8 + Math.random() * 0.4; // x
                positions[i + 1] *= 0.8 + Math.random() * 0.4; // y
                positions[i + 2] *= 0.8 + Math.random() * 0.4; // z
            }
            
            // Recompute normals
            rockGeometry.computeVertexNormals();
            
            // Rock material (slightly different color from terrain)
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: 0x666666, // Grayish
                roughness: 0.9,
                metalness: 0.1
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
        
        console.log("Added visual rock representations for obstacles");
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
            console.log("Creating physics ground with proper collision detection...");
            
            // FOR DEBUGGING - Create a simple ground plane first to ensure collision works
            // This is a flat plane that should definitely catch the marble
            const groundShape = new CANNON.Plane();
            const groundBody = new CANNON.Body({
                mass: 0, // Static body
                position: new CANNON.Vec3(0, -0.05, 0), // Just below visual terrain
                material: new CANNON.Material('groundMaterial')
            });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2); // Rotate to face up
            this.world.addBody(groundBody);
            console.log("Added backup ground plane at y=-0.05");
            
            // Create a heightfield shape using our height data
            const elementSize = this.size / (this.resolution - 1);
            
            // Create a matrix of heights
            const heights = [];
            for (let i = 0; i < this.resolution; i++) {
                heights[i] = [];
                for (let j = 0; j < this.resolution; j++) {
                    const index = i * this.resolution + j;
                    heights[i][j] = this.heightData[index] || 0; // Default to 0 if not found
                }
            }
            
            // Create the heightfield shape for accurate physics
            const heightfieldShape = new CANNON.Heightfield(heights, {
                elementSize: elementSize
            });
            
            // Create the ground body with proper bounce properties
            this.body = new CANNON.Body({
                mass: 0, // Static body
                material: new CANNON.Material('terrainMaterial')
            });
            
            // IMPORTANT: Position must account for height field centering
            // Heightfield is centered on its local x and z axes and has its local y axis pointing up
            const sizeX = (this.resolution - 1) * elementSize;
            const sizeZ = (this.resolution - 1) * elementSize;
            this.body.position.set(-sizeX/2, 0, -sizeZ/2);
            
            // Add the shape
            this.body.addShape(heightfieldShape);
            
            // Use a better material for the terrain - adjusted for proper friction/bounce
            this.body.material.friction = 0.5;      // Increased friction for obstacles to slow the marble
            this.body.material.restitution = 0.9;   // Keep high restitution for good bounce
            
            // Set physics parameters to help with bounce simulation
            this.body.linearDamping = 0;            // No damping for static bodies
            this.body.angularDamping = 0;
            this.body.fixedRotation = true;         // No rotation for terrain
            
            // Adjust contact parameters
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
                    friction: 0.5,                  // Higher friction to make obstacles effective
                    restitution: 0.9,               // Keep high restitution for bounces
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3,
                    frictionEquationStiffness: 1e7, // Increased for better friction response
                    frictionEquationRelaxation: 3
                }
            );
            this.world.addContactMaterial(contactMaterial);
            
            // Add separate physics bodies for large rocks
            this.addRockBodies();
            
            console.log("Terrain physics created with enhanced obstacles and friction properties");
            console.log("Heightfield position:", this.body.position.x, this.body.position.y, this.body.position.z);
            console.log("Heightfield size:", sizeX, "x", sizeZ, "Element size:", elementSize);
        } catch (error) {
            console.error("Error creating terrain physics:", error);
        }
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
            rockBody.material.friction = 0.9;
            rockBody.material.restitution = 0.4; // Lower restitution than terrain for more "solid" feel
            
            // Add to world
            this.world.addBody(rockBody);
            
            // Create contact material with marble
            const marbleMaterial = new CANNON.Material('marbleMaterial');
            const rockMarbleContact = new CANNON.ContactMaterial(
                rockBody.material,
                marbleMaterial,
                {
                    friction: 0.9,                // Very high friction to stop marble
                    restitution: 0.4,             // Lower restitution - rocks don't bounce as much
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3
                }
            );
            this.world.addContactMaterial(rockMarbleContact);
        }
        
        console.log("Added separate physics bodies for large rocks");
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
} 