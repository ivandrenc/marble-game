// Player and marble handling for the marble game

class Player {
    constructor(scene, world, terrain) {
        this.scene = scene;
        this.world = world;
        this.terrain = terrain;
        
        // Player position configuration
        this.distanceFromCenter = 2.5;    // 2.5 meters from circle center - increased for better view
        this.minDistance = 1.5;           // Minimum distance from circle
        this.maxDistance = 3.0;           // Maximum distance from circle - increased
        this.currentAngle = 0;            // Starting angle (in radians)
        this.rotationSpeed = 0.05;        // Rotation speed
        
        // Camera configuration - better downward view
        this.cameraHeight = 0.8;          // Camera height above ground (80cm) - increased
        this.minCameraHeight = 0.3;       // Minimum camera height
        this.maxCameraHeight = 1.5;       // Maximum camera height
        this.cameraHeightStep = 0.1;      // How much to change height by
        this.cameraAngle = -0.3;          // Camera tilt angle in radians (downward tilt)
        
        // Marble configuration - significantly larger
        this.marbleRadius = 0.05;         // 5 cm radius (10 cm diameter) - increased for better visibility
        this.marbleHeight = 0.15;         // Starting height (15 cm) - increased
        this.minHeight = 0.05;            // Minimum height (5 cm)
        this.maxHeight = 0.35;            // Maximum height (35 cm)
        this.heightStep = 0.03;           // Adjustment step (3 cm)
        
        // Throw configuration - improved for undershooting and overshooting
        this.throwPower = 0;              // Current throw power
        this.minThrowPower = 0.8;         // Minimum throw power - lands 0.5m short of circle edge
        this.maxThrowPower = 8.5;         // Maximum throw power - overshoots by 1m
        this.throwChargeRate = 0.03;      // How fast power increases when holding spacebar (faster)
        this.maxChargeTime = 2.0;         // 2 seconds to reach maximum power
        this.isCharging = false;          // Whether currently charging a throw
        this.chargeStartTime = 0;         // When charging started
        this.remainingMarbles = 5;        // Number of marbles
        
        // Create the camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20);
        
        // Currently active marble (if thrown)
        this.activeMarble = null;
        
        // Create the marble materials for physics
        this.createMarbleMaterials();
        
        // Create the marble preview
        this.createMarblePreview();
        
        // Update position to initialize camera
        this.updatePosition();
        
        // Set up key event listeners
        this.setupControls();
        
        console.log("Player initialized at position:", this.getPlayerPosition());
    }
    
    createMarbleMaterials() {
        // Create physics material for the marble with improved properties for terrain interaction
        this.marbleMaterial = new CANNON.Material('marbleMaterial');
        this.marbleMaterial.friction = 0.95;      // Very high friction to detect micro-bumps
        this.marbleMaterial.restitution = 0.5;    // Moderate restitution for balanced bounce behavior

        // Create contact material between marble and ground
        if (this.terrain && this.terrain.body && this.terrain.body.material) {
            const terrainMaterial = this.terrain.body.material;
            
            // Create the contact material with improved properties for micro-terrain sensitivity
            this.marbleTerrainContact = new CANNON.ContactMaterial(
                this.marbleMaterial,
                terrainMaterial,
                {
                    friction: 0.95,                   // Very high friction to feel every bump
                    restitution: 0.5,                 // Moderate restitution for natural feel
                    contactEquationStiffness: 5e8,    // Stiffer contact for micro-feature detection
                    contactEquationRelaxation: 3,     // Relaxation for stable contacts
                    frictionEquationStiffness: 5e7,   // Higher stiffness for sensitive friction response
                    frictionEquationRelaxation: 3     // Balanced relaxation
                }
            );
            
            // Add to world
            this.world.addContactMaterial(this.marbleTerrainContact);
            console.log("Marble-terrain contact material created for micro-terrain interaction");

            // Also create a contact material with the backup ground plane
            const groundMaterial = new CANNON.Material('groundMaterial');
            const marbleGroundContact = new CANNON.ContactMaterial(
                this.marbleMaterial,
                groundMaterial,
                {
                    friction: 0.95,                  // Very high friction for backup plane
                    restitution: 0.5,                // Moderate restitution
                    contactEquationStiffness: 5e8,
                    contactEquationRelaxation: 3
                }
            );
            this.world.addContactMaterial(marbleGroundContact);
        } else {
            console.warn("Terrain material not found, creating fallback contact material");
            // Create a fallback contact with the default material
            this.marbleTerrainContact = new CANNON.ContactMaterial(
                this.marbleMaterial,
                new CANNON.Material(),
                {
                    friction: 0.95,
                    restitution: 0.5
                }
            );
            this.world.addContactMaterial(this.marbleTerrainContact);
        }

        // Create a contact material with the default material to ensure collision with all objects
        const defaultMaterial = new CANNON.Material('defaultMaterial');
        const marbleDefaultContact = new CANNON.ContactMaterial(
            this.marbleMaterial,
            defaultMaterial,
            {
                friction: 0.95,
                restitution: 0.5,
                contactEquationStiffness: 5e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(marbleDefaultContact);
        
        // Add specific contacts for rock obstacles
        const rockMaterial = new CANNON.Material('rockMaterial');
        const marbleRockContact = new CANNON.ContactMaterial(
            this.marbleMaterial,
            rockMaterial,
            {
                friction: 0.95,                // Very high friction to stop on rocks
                restitution: 0.4,             // Lower restitution for rocks
                contactEquationStiffness: 5e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(marbleRockContact);
        console.log("Added specialized rock contact material for enhanced obstacle interaction");
    }
    
    createMarblePreview() {
        // Create marble geometry
        const geometry = new THREE.SphereGeometry(this.marbleRadius, 32, 32);
        
        // Create marble material (more colorful and visible)
        const material = new THREE.MeshStandardMaterial({
            color: 0xff3030,        // Bright red color for high visibility
            metalness: 0.8,         // More metallic look
            roughness: 0.1,         // Very smooth for glass/metal appearance
            emissive: 0x300000,     // Slight glow
            emissiveIntensity: 0.2  // Subtle emission for better visibility
        });
        
        // Create mesh
        this.marblePreview = new THREE.Mesh(geometry, material);
        this.marblePreview.castShadow = true;  // Make sure it casts shadows
        this.scene.add(this.marblePreview);
        
        // Update position
        this.updateMarblePreviewPosition();
    }
    
    createActiveMarble() {
        // Use the same properties as the preview marble but a different color
        const geometry = new THREE.SphereGeometry(this.marbleRadius, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3030ff,        // Bright blue for active marble
            metalness: 0.8,         // More metallic look
            roughness: 0.1,         // Very smooth for glass/metal appearance
            emissive: 0x000030,     // Slight blue glow
            emissiveIntensity: 0.2  // Subtle emission for better visibility
        });
        
        // Create the mesh
        const marbleMesh = new THREE.Mesh(geometry, material);
        marbleMesh.castShadow = true;
        marbleMesh.receiveShadow = true;
        this.scene.add(marbleMesh);
        
        // Create the physics body
        const marbleShape = new CANNON.Sphere(this.marbleRadius);
        
        // Create the body with physics properties optimized for terrain interaction
        const marbleBody = new CANNON.Body({
            mass: 0.05,                     // 50 grams (lighter to be more affected by small bumps)
            material: this.marbleMaterial,
            linearDamping: 0.2,             // Increased damping to be more sensitive to terrain
            angularDamping: 0.1,            // Moderate angular damping for natural rolling
            allowSleep: false,              // Don't allow sleep for continuous terrain interaction
            fixedRotation: false,           // Allow rotation for realistic behavior
            collisionFilterGroup: 1,        // Put in default group
            collisionFilterMask: -1,        // Collide with everything
            type: CANNON.Body.DYNAMIC       // Ensure it's dynamic
        });
        
        // Add the sphere shape to the body
        marbleBody.addShape(marbleShape);
        
        // Get the player position and calculate throw direction
        const playerPosition = this.getPlayerPosition();
        
        // Set the initial position and velocity
        marbleBody.position.set(
            playerPosition.x,
            playerPosition.y + this.marbleHeight,
            playerPosition.z
        );
        
        // Log marble's starting position
        console.log("Marble starting position:", 
            marbleBody.position.x.toFixed(2),
            marbleBody.position.y.toFixed(2),
            marbleBody.position.z.toFixed(2)
        );
        
        // Calculate throw direction vector
        const dirToCenter = new CANNON.Vec3(-playerPosition.x, 0, -playerPosition.z);
        if (dirToCenter.length() < 0.001) {
            // Avoid normalization errors with tiny vectors
            dirToCenter.set(1, 0, 0);
        } else {
            dirToCenter.normalize();
        }
        
        // Calculate a throw trajectory with proper vertical component
        // Use a lower upward component to better show terrain interaction
        const throwDirection = new CANNON.Vec3(
            dirToCenter.x,
            Math.max(0.2, this.throwPower * 0.1), // Lower upward component for better terrain feel
            dirToCenter.z
        );
        
        // Normalize the direction and then scale by power
        throwDirection.normalize();
        
        // Apply power with emphasis on horizontal movement for better terrain interaction
        let horizontalPower = this.throwPower * 1.3; // More horizontal movement
        let verticalPower = this.throwPower * 0.7;   // Less vertical movement
        
        marbleBody.velocity.set(
            throwDirection.x * horizontalPower,
            throwDirection.y * verticalPower,
            throwDirection.z * horizontalPower
        );
        
        // Add less spin so terrain features are more noticeable
        marbleBody.angularVelocity.set(
            random(-5, 5),
            random(-2, 2),
            random(-5, 5)
        );
        
        // Enable collision response
        marbleBody.collisionResponse = true;
        
        // Set additional physics properties for better terrain interaction
        marbleBody.sleepSpeedLimit = 0.005;  // Even lower sleep threshold to feel small terrain features
        marbleBody.sleepTimeLimit = 1;      // Sleep sooner when stuck in terrain features
        
        // Track whether the marble has encountered obstacles
        marbleBody.userData = { 
            hasCollidedWithObstacle: false,
            lastObstacleCollision: 0,
            obstacleCollisions: 0
        };
        
        // Add to the physics world
        this.world.addBody(marbleBody);
        
        // Add a callback to log impacts for debugging
        marbleBody.addEventListener('collide', (e) => {
            console.log("Marble collision detected with body ID:", e.body.id);
            const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
            console.log("Impact velocity:", relativeVelocity.toFixed(2));
            
            // Check if the marble is moving upward after collision (bounce)
            if (marbleBody.velocity.y > 0.1) {
                console.log("Bounce detected! Upward velocity:", marbleBody.velocity.y.toFixed(2));
            }
            
            // If the collision is with a rock or hill, mark as obstacle collision
            if (e.body.material && 
                (e.body.material.name === 'rockMaterial' || 
                 Math.abs(relativeVelocity) > 1.5)) {
                
                marbleBody.userData.hasCollidedWithObstacle = true;
                marbleBody.userData.lastObstacleCollision = performance.now();
                marbleBody.userData.obstacleCollisions++;
                
                console.log("Obstacle collision detected! Total:", marbleBody.userData.obstacleCollisions);
                
                // Apply additional speed reduction when hit obstacles for more realistic behavior
                const timeSinceCollision = performance.now() - this.activeMarble.body.userData.lastObstacleCollision;
                if (timeSinceCollision < 500) { // Recent collision
                    // Apply rolling resistance - slow down faster on horizontal movement
                    const horizSpeed = Math.sqrt(
                        this.activeMarble.body.velocity.x * this.activeMarble.body.velocity.x + 
                        this.activeMarble.body.velocity.z * this.activeMarble.body.velocity.z
                    );
                    
                    if (horizSpeed > 0.2) { // Lower threshold to respond to smaller terrain changes
                        const resistance = 0.95; // 5% reduction per frame after any terrain impact
                        this.activeMarble.body.velocity.x *= resistance;
                        this.activeMarble.body.velocity.z *= resistance;
                    }
                }
            }
            
            // Apply continuous terrain sensitivity by reducing velocity slightly on each contact
            // This helps the marble naturally follow terrain undulations
            const speed = marbleBody.velocity.length();
            if (speed > 0.2) {
                // Subtle general velocity reduction on any terrain contact (0.5%)
                const terrainResistance = 0.995;
                
                // Apply only to horizontal components to maintain bouncing
                const horizSpeed = Math.sqrt(
                    marbleBody.velocity.x * marbleBody.velocity.x + 
                    marbleBody.velocity.z * marbleBody.velocity.z
                );
                
                if (horizSpeed > 0.2) {
                    marbleBody.velocity.x *= terrainResistance;
                    marbleBody.velocity.z *= terrainResistance;
                }
            }
        });
        
        // Return the active marble object
        return {
            mesh: marbleMesh,
            body: marbleBody,
            createdAt: performance.now(),
            lastY: marbleBody.position.y, 
            lastCheckTime: performance.now(),
            bounceCount: 0,
            obstacleCollisions: 0
        };
    }
    
    updatePosition() {
        // Calculate player position based on angle and distance
        const position = this.getPlayerPosition();
        
        // Calculate direction vector (from player towards the center)
        const dirX = -position.x;
        const dirZ = -position.z;
        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
        const normalizedDirX = dirX / length;
        const normalizedDirZ = dirZ / length;
        
        // Set the camera position higher above the player for better viewing angle
        this.camera.position.set(
            position.x, 
            position.y + this.cameraHeight, 
            position.z
        );
        
        // Create a look-at target that's ahead and downward
        const targetX = position.x + normalizedDirX * 1.0;
        const targetY = Math.max(-0.2, position.y + this.cameraAngle);  // Don't look too far down
        const targetZ = position.z + normalizedDirZ * 1.0;
        
        // Make camera look at the target point
        this.camera.lookAt(targetX, targetY, targetZ);
        
        if (this.frameCount % 100 === 0) {
            console.log("Camera height:", this.cameraHeight);
        }
    }
    
    getPlayerPosition() {
        // Convert polar coordinates to Cartesian
        const x = this.distanceFromCenter * Math.cos(this.currentAngle);
        const z = this.distanceFromCenter * Math.sin(this.currentAngle);
        
        // Get terrain height at this position
        const terrainHeight = this.terrain.getHeightAt(x, z);
        
        // Ensure we're always slightly above the terrain
        const y = terrainHeight + 0.01; // 1 cm above terrain
        
        return { x, y, z };
    }
    
    updateMarblePreviewPosition() {
        if (!this.marblePreview) return;
        
        const position = this.getPlayerPosition();
        this.marblePreview.position.set(
            position.x,
            position.y + this.marbleHeight,
            position.z
        );
    }
    
    update(deltaTime) {
        try {
            // Update frame counter
            this.frameCount = (this.frameCount || 0) + 1;
            
            // Check if an active marble exists
            if (this.activeMarble) {
                // Update the mesh position from the physics body
                this.activeMarble.mesh.position.copy(this.activeMarble.body.position);
                this.activeMarble.mesh.quaternion.copy(this.activeMarble.body.quaternion);
                
                // Better bounce detection by checking velocity changes
                const now = performance.now();
                if (now - this.activeMarble.lastCheckTime > 100) { // Check every 100ms
                    const currY = this.activeMarble.body.position.y;
                    const prevY = this.activeMarble.lastY;
                    
                    // If we're moving upward and were moving downward before, it's a bounce
                    if (this.activeMarble.body.velocity.y > 0.1 && currY > prevY) {
                        this.activeMarble.bounceCount++;
                        
                        // Update UI with bounce count if available
                        const bounceInfoEl = document.getElementById('bounce-info');
                        if (bounceInfoEl) {
                            bounceInfoEl.textContent = `Bounces: ${this.activeMarble.bounceCount}`;
                        }
                        
                        console.log("Bounce detected! Count:", this.activeMarble.bounceCount, 
                            "Velocity:", this.activeMarble.body.velocity.y.toFixed(2),
                            "Position:", currY.toFixed(2));
                    }
                    
                    // Check for obstacle interactions
                    if (this.activeMarble.body.userData && 
                        this.activeMarble.body.userData.hasCollidedWithObstacle) {
                        
                        // Update obstacle collision count
                        this.activeMarble.obstacleCollisions = 
                            this.activeMarble.body.userData.obstacleCollisions;
                            
                        // Update UI with obstacle count if available
                        const obstacleInfoEl = document.getElementById('obstacle-info');
                        if (obstacleInfoEl) {
                            obstacleInfoEl.textContent = 
                                `Obstacle hits: ${this.activeMarble.obstacleCollisions}`;
                        }
                        
                        // Apply additional speed reduction when hit obstacles for more realistic behavior
                        const timeSinceCollision = now - this.activeMarble.body.userData.lastObstacleCollision;
                        if (timeSinceCollision < 500) { // Recent collision
                            // Apply rolling resistance - slow down faster on horizontal movement
                            const horizSpeed = Math.sqrt(
                                this.activeMarble.body.velocity.x * this.activeMarble.body.velocity.x + 
                                this.activeMarble.body.velocity.z * this.activeMarble.body.velocity.z
                            );
                            
                            if (horizSpeed > 0.2) { // Lower threshold to respond to smaller terrain changes
                                const resistance = 0.95; // 5% reduction per frame after any terrain impact
                                this.activeMarble.body.velocity.x *= resistance;
                                this.activeMarble.body.velocity.z *= resistance;
                            }
                        }
                    }
                    
                    // Check for nearly stopped marble
                    const speed = this.activeMarble.body.velocity.length();
                    if (speed < 0.2 && this.activeMarble.body.position.y < 0.1) {
                        this.activeMarble.almostStopped = true;
                    }
                    
                    // Update tracking variables
                    this.activeMarble.lastY = currY;
                    this.activeMarble.lastCheckTime = now;
                }
                
                // Debug every 30 frames, log position and velocity
                if (this.frameCount % 30 === 0) {
                    const pos = this.activeMarble.body.position;
                    const vel = this.activeMarble.body.velocity;
                    console.log(`Marble: pos(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) ` +
                                `vel(${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)})`);
                                
                    // Calculate distance to target
                    const distToTarget = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
                    
                    // Update distance display if available
                    const distanceEl = document.getElementById('distance-info');
                    if (distanceEl) {
                        distanceEl.textContent = `Distance to target: ${distToTarget.toFixed(2)}m`;
                        
                        // Update scoring display
                        if (distToTarget < 0.15) {
                            distanceEl.textContent += " - BULLSEYE! +30 pts";
                            distanceEl.style.color = 'red';
                        } else if (distToTarget < 0.3) {
                            distanceEl.textContent += " - GREAT! +20 pts";
                            distanceEl.style.color = 'orange';
                        } else if (distToTarget < 0.45) {
                            distanceEl.textContent += " - GOOD! +10 pts";
                            distanceEl.style.color = 'blue';
                        }
                    }
                }
                
                // Check if the marble is below the terrain (fell in the hole) or far away
                if (this.activeMarble.body.position.y < -0.5 || 
                    this.activeMarble.body.position.distanceTo(new CANNON.Vec3(0, 0, 0)) > 5) {
                    
                    // Remove the marble
                    this.removeActiveMarble();
                }
                // Check if the marble has stopped moving for a while
                else if ((this.activeMarble.almostStopped && 
                         this.activeMarble.body.velocity.lengthSquared() < 0.01 &&
                         performance.now() - this.activeMarble.createdAt > 2000) || 
                         (performance.now() - this.activeMarble.createdAt > 15000)) { // Max 15 seconds per throw
                    
                    // Calculate final score before removing
                    const pos = this.activeMarble.body.position;
                    const distToTarget = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
                    let points = 0;
                    
                    if (distToTarget < 0.15) {
                        points = 30; // Bullseye
                    } else if (distToTarget < 0.3) {
                        points = 20; // Middle ring
                    } else if (distToTarget < 0.45) {
                        points = 10; // Outer ring
                    }
                    
                    // Add bonus for each obstacle hit (encourages interesting throws)
                    points += this.activeMarble.obstacleCollisions * 5;
                    
                    // Show score if UI is available
                    const scoreEl = document.getElementById('score-info');
                    if (scoreEl) {
                        this.totalScore = (this.totalScore || 0) + points;
                        scoreEl.textContent = `Score: ${this.totalScore}`;
                        
                        if (points > 0) {
                            // Create a floating score indicator
                            const scoreIndicator = document.createElement('div');
                            scoreIndicator.style.position = 'absolute';
                            scoreIndicator.style.left = '50%';
                            scoreIndicator.style.top = '50%';
                            scoreIndicator.style.transform = 'translate(-50%, -50%)';
                            scoreIndicator.style.color = 'white';
                            scoreIndicator.style.fontSize = '24px';
                            scoreIndicator.style.fontWeight = 'bold';
                            scoreIndicator.style.textShadow = '2px 2px 4px black';
                            scoreIndicator.style.zIndex = '1000';
                            scoreIndicator.style.transition = 'opacity 1s, transform 1s';
                            scoreIndicator.textContent = `+${points}`;
                            
                            document.body.appendChild(scoreIndicator);
                            
                            // Animate and remove
                            setTimeout(() => {
                                scoreIndicator.style.opacity = '0';
                                scoreIndicator.style.transform = 'translate(-50%, -150%)';
                                setTimeout(() => {
                                    document.body.removeChild(scoreIndicator);
                                }, 1000);
                            }, 100);
                        }
                    }
                    
                    // Remove the marble
                    this.removeActiveMarble();
                }
                
                // Apply continuous terrain interaction - sample terrain more frequently
                if (this.activeMarble.body.position.y < 0.5) { // Only when near terrain
                    // Get current terrain height at marble position
                    const x = this.activeMarble.body.position.x;
                    const z = this.activeMarble.body.position.z;
                    const terrainHeight = this.terrain.getHeightAt(x, z);
                    
                    // Calculate terrain gradient by sampling in multiple directions
                    const sampleDistance = 0.03; // Smaller sampling distance for micro features (3cm)
                    
                    // Sample in the direction of travel
                    const velX = this.activeMarble.body.velocity.x;
                    const velZ = this.activeMarble.body.velocity.z;
                    const horizSpeed = Math.sqrt(velX * velX + velZ * velZ);
                    
                    if (horizSpeed > 0.01) { // Only if we're moving horizontally
                        // Normalize velocity direction
                        const dirX = velX / horizSpeed;
                        const dirZ = velZ / horizSpeed;
                        
                        // Sample height in direction of travel
                        const forwardHeight = this.terrain.getHeightAt(
                            x + dirX * sampleDistance,
                            z + dirZ * sampleDistance
                        );
                        
                        // Calculate height difference (positive = uphill)
                        const heightDiff = forwardHeight - terrainHeight;
                        
                        // Apply resistance based on slope - more resistance going uphill
                        if (heightDiff > 0.001) { // Going uphill
                            // Stronger resistance on steeper slopes - cubic relationship
                            const slopeSteepness = Math.min(0.03, heightDiff) / 0.03; // Normalize to 0-1
                            const uphillResistance = 1.0 - (slopeSteepness * slopeSteepness * 0.07);
                            
                            // Apply resistance to horizontal velocity components
                            this.activeMarble.body.velocity.x *= uphillResistance;
                            this.activeMarble.body.velocity.z *= uphillResistance;
                            
                            // Apply a tiny boost to Y velocity for small bumps to prevent getting stuck
                            if (this.activeMarble.body.velocity.y < 0.1 && horizSpeed > 0.5) {
                                const bumpBoost = heightDiff * 5; // Scale with height difference
                                this.activeMarble.body.velocity.y += Math.min(0.05, bumpBoost);
                            }
                        }
                        
                        // Apply micro-resistance even on flat terrain to simulate soil texture
                        const microResistance = 0.998; // Very subtle 0.2% reduction per frame
                        this.activeMarble.body.velocity.x *= microResistance;
                        this.activeMarble.body.velocity.z *= microResistance;
                    }
                    
                    // Apply rolling behavior when marble is almost stopped
                    const speed = this.activeMarble.body.velocity.length();
                    if (speed < 0.5 && this.activeMarble.body.position.y < 0.1) {
                        // Check if we're on a slope that should cause rolling
                        const leftHeight = this.terrain.getHeightAt(x - sampleDistance, z);
                        const rightHeight = this.terrain.getHeightAt(x + sampleDistance, z);
                        const frontHeight = this.terrain.getHeightAt(x, z + sampleDistance);
                        const backHeight = this.terrain.getHeightAt(x, z - sampleDistance);
                        
                        // Calculate slope gradients
                        const xGradient = (rightHeight - leftHeight) / (2 * sampleDistance);
                        const zGradient = (frontHeight - backHeight) / (2 * sampleDistance);
                        
                        // If on a slope, add a small velocity in the downhill direction
                        const slopeThreshold = 0.05; // Minimum slope to cause rolling
                        const maxRollAccel = 0.02;   // Maximum acceleration from slope
                        
                        if (Math.abs(xGradient) > slopeThreshold || Math.abs(zGradient) > slopeThreshold) {
                            // Apply force in the direction of the slope
                            const rollAccelX = -xGradient * maxRollAccel; // Negative because downhill is opposite to gradient
                            const rollAccelZ = -zGradient * maxRollAccel;
                            
                            // Add to velocity
                            this.activeMarble.body.velocity.x += rollAccelX;
                            this.activeMarble.body.velocity.z += rollAccelZ;
                        }
                    }
                }
            }
            
            // Update the player position
            this.updatePosition();
            
            // Update marble preview position
            this.updateMarblePreviewPosition();
            
            // Update power meter when charging - calculate based on time for consistent charging
            if (this.isCharging) {
                const chargeTime = (performance.now() - this.chargeStartTime) / 1000; // in seconds
                const powerRatio = Math.min(chargeTime / this.maxChargeTime, 1.0);
                
                // Scale between min and max throw power
                this.throwPower = this.minThrowPower + 
                                 (this.maxThrowPower - this.minThrowPower) * powerRatio;
                
                this.updatePowerMeter();
                
                // Provide visual feedback about current power level
                if (this.frameCount % 30 === 0) {
                    const distanceEstimate = this.estimateThrowDistance(this.throwPower);
                    
                    // Update throw power display if available
                    const powerEl = document.getElementById('power-info');
                    if (powerEl) {
                        powerEl.textContent = `Power: ${(powerRatio * 100).toFixed(0)}%`;
                    }
                    
                    console.log(`Charge: ${(powerRatio * 100).toFixed(0)}%, Power: ${this.throwPower.toFixed(2)}, Est. distance: ${distanceEstimate.toFixed(1)}m`);
                }
            }
        } catch (error) {
            console.error("Error in player update:", error);
        }
    }
    
    estimateThrowDistance(power) {
        // Simple approximation of distance based on power
        // This is just an estimate - actual physics will determine true distance
        const circleRadius = 0.5; // Half of circle diameter (1m)
        const playerDistance = this.distanceFromCenter;
        
        if (power <= this.minThrowPower) {
            return playerDistance - circleRadius - 0.5; // 0.5m short of the circle edge
        } else if (power >= this.maxThrowPower) {
            return playerDistance + circleRadius + 1.0; // 1m past the far edge
        } else {
            // Linear interpolation between min and max distances
            const minDist = playerDistance - circleRadius - 0.5;
            const maxDist = playerDistance + circleRadius + 1.0;
            const powerRatio = (power - this.minThrowPower) / (this.maxThrowPower - this.minThrowPower);
            return minDist + (maxDist - minDist) * powerRatio;
        }
    }
    
    updatePowerMeter() {
        const powerLevel = document.getElementById('power-level');
        if (powerLevel) {
            // Scale between min and max throw power
            const percentage = ((this.throwPower - this.minThrowPower) / 
                              (this.maxThrowPower - this.minThrowPower)) * 100;
            
            powerLevel.style.width = percentage + '%';
            
            // Change color based on power
            if (percentage < 33) {
                powerLevel.style.backgroundColor = 'green';
            } else if (percentage < 66) {
                powerLevel.style.backgroundColor = 'yellow';
            } else {
                powerLevel.style.backgroundColor = 'red';
            }
        }
    }
    
    removeActiveMarble() {
        if (!this.activeMarble) return;
        
        // Remove from scene and physics world
        this.scene.remove(this.activeMarble.mesh);
        this.world.removeBody(this.activeMarble.body);
        
        // Show preview again
        if (this.marblePreview) {
            this.marblePreview.visible = true;
        }
        
        // Clear reference
        this.activeMarble = null;
        
        // Log that the marble was removed
        console.log("Marble removed, remaining marbles:", this.remainingMarbles);
    }
    
    setupControls() {
        // Handle keyboard input
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.moveRight();
                    break;
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.increaseHeight();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.decreaseHeight();
                    break;
                case ' ':
                    // Start charging throw power when spacebar is pressed
                    if (!this.isCharging && this.activeMarble === null && this.remainingMarbles > 0) {
                        this.startCharging();
                    }
                    break;
            }
        });
        
        // Release throw when spacebar is released
        document.addEventListener('keyup', (event) => {
            if (event.key === ' ' && this.isCharging) {
                this.throwMarble();
            }
        });
        
        console.log("Controls set up");
    }
    
    moveLeft() {
        this.currentAngle = (this.currentAngle - this.rotationSpeed) % (2 * Math.PI);
    }
    
    moveRight() {
        this.currentAngle = (this.currentAngle + this.rotationSpeed) % (2 * Math.PI);
    }
    
    increaseHeight() {
        // Change camera height instead of marble height
        this.cameraHeight = Math.min(this.maxCameraHeight, this.cameraHeight + this.cameraHeightStep);
        console.log("Camera height increased to:", this.cameraHeight);
    }
    
    decreaseHeight() {
        // Change camera height instead of marble height
        this.cameraHeight = Math.max(this.minCameraHeight, this.cameraHeight - this.cameraHeightStep);
        console.log("Camera height decreased to:", this.cameraHeight);
    }
    
    startCharging() {
        this.isCharging = true;
        this.throwPower = this.minThrowPower; // Start with minimum power
        this.chargeStartTime = performance.now();
        
        // Update the power meter
        this.updatePowerMeter();
        console.log("Started charging throw with min power:", this.minThrowPower);
    }
    
    throwMarble() {
        // Stop charging
        this.isCharging = false;
        
        // Reset power meter
        const powerLevel = document.getElementById('power-level');
        if (powerLevel) {
            powerLevel.style.width = '0%';
        }
        
        // Hide preview
        if (this.marblePreview) {
            this.marblePreview.visible = false;
        }
        
        // Create and throw the marble
        this.activeMarble = this.createActiveMarble();
        this.remainingMarbles--;
        
        // Log throw power
        console.log("Marble thrown with power:", this.throwPower.toFixed(2), 
                    "from position:", 
                    this.activeMarble.body.position.x.toFixed(2),
                    this.activeMarble.body.position.y.toFixed(2),
                    this.activeMarble.body.position.z.toFixed(2));
    }
} 