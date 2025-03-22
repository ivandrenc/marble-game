import * as THREE from 'three';

export default class Condor {
  constructor(scene, loadingManager) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.condorGroup = null;
    this.leftWing = null;
    this.rightWing = null;
    this.body = null;
    this.head = null;
    this.tailFeathers = null;
    
    // Constants
    this.MAX_WING_ROTATION = 0.3;
    this.WING_ROTATE_SPEED = 0.05;
    this.WING_RESET_SPEED = 0.03;
    this.MAX_PITCH_ANGLE = 0.4; // Maximum pitch angle for descent/ascent
    this.PITCH_ADJUSTMENT_SPEED = 0.05; // How quickly pitch adjusts
    
    // Create the condor model
    this.create();
  }
  
  create() {
    // Main condor group
    this.condorGroup = new THREE.Group();
    
    // Create a detailed synthetic condor
    this.createDetailedCondor();
    
    // Set initial position
    this.condorGroup.position.set(0, 200, 0);
    
    // Add to scene
    this.scene.add(this.condorGroup);
    
    return this.condorGroup;
  }
  
  createDetailedCondor() {
    // Materials for different parts
    const blackFeatherMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2A1A10, // Darker brown-black for body
      shininess: 5,
      flatShading: true 
    });
    
    const whiteFeatherMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xF5F0E8, // Slightly off-white for the neck ruff
      shininess: 5,
      flatShading: true 
    });
    
    const beakMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xe8a952, // More orange/tan color to match reference image
      shininess: 30
    });
    
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x000000,
      shininess: 50
    });
    
    // Body - more oval shape for a bird
    const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
    bodyGeometry.scale(1, 0.8, 1.5);
    this.body = new THREE.Mesh(bodyGeometry, blackFeatherMaterial);
    this.condorGroup.add(this.body);
    
    // Create detailed wings (multiple sections for better articulation)
    this.createWings(blackFeatherMaterial);
    
    // Head - position at the negative Z to face forward in flight direction
    const headGeometry = new THREE.SphereGeometry(0.6, 32, 16);
    headGeometry.scale(0.8, 0.8, 1);
    this.head = new THREE.Mesh(headGeometry, blackFeatherMaterial);
    this.head.position.set(0, 0.4, -1.4); // Negative Z instead of positive
    this.condorGroup.add(this.head);
    
    // Red fleshy comb/crest (characteristic of the Andean condor)
    const combMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xdd2222, // Bright red color
      shininess: 30,
      flatShading: false 
    });
    
    // Main comb on top of head
    const combGeometry = new THREE.SphereGeometry(0.2, 16, 8);
    combGeometry.scale(1, 0.7, 0.8);
    const comb = new THREE.Mesh(combGeometry, combMaterial);
    comb.position.set(0, 0.75, -1.55);
    this.condorGroup.add(comb);
    
    // Additional smaller bumps for texture
    const smallCombGeometry = new THREE.SphereGeometry(0.1, 8, 6);
    
    // Front bump
    const frontComb = new THREE.Mesh(smallCombGeometry, combMaterial);
    frontComb.position.set(0, 0.7, -1.75);
    frontComb.scale.set(0.8, 0.6, 0.6);
    this.condorGroup.add(frontComb);
    
    // Back bump
    const backComb = new THREE.Mesh(smallCombGeometry, combMaterial);
    backComb.position.set(0, 0.7, -1.35);
    backComb.scale.set(0.8, 0.5, 0.6);
    this.condorGroup.add(backComb);
    
    // White neck ruff (characteristic of Andean condor)
    const ruffGeometry = new THREE.TorusGeometry(0.65, 0.35, 16, 24);
    const ruff = new THREE.Mesh(ruffGeometry, whiteFeatherMaterial);
    ruff.position.set(0, 0.2, -0.9); // Negative Z instead of positive
    ruff.rotation.x = Math.PI / 2;
    this.condorGroup.add(ruff);
    
    // Beak
    const beakGeometry = new THREE.ConeGeometry(0.2, 0.6, 16);
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0, 0.25, -2); // Negative Z instead of positive
    beak.rotation.x = -Math.PI / 2; // Inverted rotation
    this.condorGroup.add(beak);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 8); // Larger eyes
    
    // White part of the eyes
    const whiteEyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      shininess: 80
    });
    
    // Left eye - white part
    const leftEyeWhite = new THREE.Mesh(eyeGeometry, whiteEyeMaterial);
    leftEyeWhite.position.set(-0.25, 0.5, -1.7);
    this.condorGroup.add(leftEyeWhite);
    
    // Right eye - white part
    const rightEyeWhite = new THREE.Mesh(eyeGeometry, whiteEyeMaterial);
    rightEyeWhite.position.set(0.25, 0.5, -1.7);
    this.condorGroup.add(rightEyeWhite);
    
    // Black pupil in the center of each eye
    const pupilGeometry = new THREE.SphereGeometry(0.08, 12, 6);
    const pupilMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x000000,
      shininess: 100
    });
    
    // Left eye pupil
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.25, 0.5, -1.83); // Slightly forward of the white
    this.condorGroup.add(leftPupil);
    
    // Right eye pupil
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.25, 0.5, -1.83); // Slightly forward of the white
    this.condorGroup.add(rightPupil);
    
    // Add reflection to eyes for a more lively look
    const reflectionGeometry = new THREE.SphereGeometry(0.03, 8, 4);
    const reflectionMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Left eye reflection
    const leftReflection = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
    leftReflection.position.set(-0.28, 0.53, -1.87);
    this.condorGroup.add(leftReflection);
    
    // Right eye reflection
    const rightReflection = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
    rightReflection.position.set(0.22, 0.53, -1.87);
    this.condorGroup.add(rightReflection);
    
    // Tail feathers
    this.createTailFeathers(blackFeatherMaterial);
    
    // Legs
    this.createLegs();
    
    // Scale down the condor to make it much smaller compared to terrain
    this.condorGroup.scale.set(0.15, 0.15, 0.15);
    
    // We don't need to rotate the condor anymore as the model is built facing forward
    // this.condorGroup.rotation.y = Math.PI;
  }
  
  createWings(featherMaterial) {
    // Create wing groups
    const leftWingGroup = new THREE.Group();
    const rightWingGroup = new THREE.Group();
    
    // Dark brown material for wings to match reference image
    const darkBrownMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x3A2618, // Dark brown color
      shininess: 5,
      flatShading: true 
    });
    
    // Primary wing section for left wing
    const leftWingGeometry = new THREE.BoxGeometry(5, 0.1, 2);
    leftWingGeometry.translate(-2.5, 0, 0); // Move pivot to attachment point
    this.leftWing = new THREE.Mesh(leftWingGeometry, darkBrownMaterial);
    leftWingGroup.add(this.leftWing);
    
    // Secondary feather sections for left wing - create staggered feathers
    for (let i = 0; i < 7; i++) {
      const featherGeometry = new THREE.BoxGeometry(0.6, 0.05, 1.8 - (i * 0.1));
      const feather = new THREE.Mesh(featherGeometry, darkBrownMaterial);
      feather.position.set(-4.8 + (i * 0.7), 0, 0.1 + (i * 0.05));
      feather.rotation.y = Math.PI / 16;
      leftWingGroup.add(feather);
    }
    
    // Add more detailed feathers at the edges
    for (let i = 0; i < 10; i++) {
      const tipFeatherGeometry = new THREE.BoxGeometry(0.3, 0.05, 1.4 - (i * 0.05));
      const tipFeather = new THREE.Mesh(tipFeatherGeometry, darkBrownMaterial);
      tipFeather.position.set(-5.2 + (i * 0.2), 0.01, 0.3 + (i * 0.05));
      tipFeather.rotation.y = Math.PI / 12;
      tipFeather.rotation.z = Math.PI / 60 * i;
      leftWingGroup.add(tipFeather);
    }
    
    // Primary wing section for right wing
    const rightWingGeometry = new THREE.BoxGeometry(5, 0.1, 2);
    rightWingGeometry.translate(2.5, 0, 0); // Move pivot to attachment point
    this.rightWing = new THREE.Mesh(rightWingGeometry, darkBrownMaterial);
    rightWingGroup.add(this.rightWing);
    
    // Secondary feather sections for right wing - create staggered feathers
    for (let i = 0; i < 7; i++) {
      const featherGeometry = new THREE.BoxGeometry(0.6, 0.05, 1.8 - (i * 0.1));
      const feather = new THREE.Mesh(featherGeometry, darkBrownMaterial);
      feather.position.set(4.8 - (i * 0.7), 0, 0.1 + (i * 0.05));
      feather.rotation.y = -Math.PI / 16;
      rightWingGroup.add(feather);
    }
    
    // Add more detailed feathers at the edges
    for (let i = 0; i < 10; i++) {
      const tipFeatherGeometry = new THREE.BoxGeometry(0.3, 0.05, 1.4 - (i * 0.05));
      const tipFeather = new THREE.Mesh(tipFeatherGeometry, darkBrownMaterial);
      tipFeather.position.set(5.2 - (i * 0.2), 0.01, 0.3 + (i * 0.05));
      tipFeather.rotation.y = -Math.PI / 12;
      tipFeather.rotation.z = -Math.PI / 60 * i;
      rightWingGroup.add(tipFeather);
    }
    
    // Add wing tips - the distinct separated feathers at the ends of the wings
    for (let i = 0; i < 5; i++) {
      // Left wing tip feathers
      const leftTipFeatherGeometry = new THREE.BoxGeometry(0.25, 0.04, 1.6);
      const leftTipFeather = new THREE.Mesh(leftTipFeatherGeometry, darkBrownMaterial);
      leftTipFeather.position.set(-5.0 - (i * 0.2), 0, 0.5 + (i * 0.1));
      leftTipFeather.rotation.y = Math.PI / 8 + (i * Math.PI / 32);
      leftTipFeather.rotation.z = (i * Math.PI / 30);
      leftWingGroup.add(leftTipFeather);
      
      // Right wing tip feathers
      const rightTipFeatherGeometry = new THREE.BoxGeometry(0.25, 0.04, 1.6);
      const rightTipFeather = new THREE.Mesh(rightTipFeatherGeometry, darkBrownMaterial);
      rightTipFeather.position.set(5.0 + (i * 0.2), 0, 0.5 + (i * 0.1));
      rightTipFeather.rotation.y = -Math.PI / 8 - (i * Math.PI / 32);
      rightTipFeather.rotation.z = -(i * Math.PI / 30);
      rightWingGroup.add(rightTipFeather);
    }
    
    // Position wings at shoulder height
    leftWingGroup.position.set(-1, 0.1, 0);
    rightWingGroup.position.set(1, 0.1, 0);
    
    // Add wings to condor
    this.condorGroup.add(leftWingGroup);
    this.condorGroup.add(rightWingGroup);
    
    // Store references for animation
    this.leftWingGroup = leftWingGroup;
    this.rightWingGroup = rightWingGroup;
  }
  
  createTailFeathers(featherMaterial) {
    // Create tail group
    const tailGroup = new THREE.Group();
    
    // Create tail base
    const tailBaseGeometry = new THREE.BoxGeometry(1, 0.1, 1.5);
    const tailBase = new THREE.Mesh(tailBaseGeometry, featherMaterial);
    tailBase.position.set(0, 0, 1.5); // Positive Z for the tail (back of the bird)
    tailGroup.add(tailBase);
    
    // Create individual tail feathers
    for (let i = -2; i <= 2; i++) {
      const featherGeometry = new THREE.BoxGeometry(0.15, 0.05, 1.8);
      const feather = new THREE.Mesh(featherGeometry, featherMaterial);
      feather.position.set(i * 0.2, 0, 2.5); // Positive Z for the tail
      feather.rotation.x = -Math.PI / 12; // Slight upward angle
      tailGroup.add(feather);
    }
    
    this.tailFeathers = tailGroup;
    this.condorGroup.add(tailGroup);
  }
  
  createLegs() {
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const footMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    
    // Left leg
    const leftLegGroup = new THREE.Group();
    
    const leftLegGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8);
    const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
    leftLeg.position.set(0, -0.4, 0);
    leftLegGroup.add(leftLeg);
    
    // Left foot
    const leftFootGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.5);
    const leftFoot = new THREE.Mesh(leftFootGeometry, footMaterial);
    leftFoot.position.set(0, -0.825, 0.1);
    leftLegGroup.add(leftFoot);
    
    leftLegGroup.position.set(-0.4, 0, 0.3); // Adjusted Z position
    this.condorGroup.add(leftLegGroup);
    
    // Right leg
    const rightLegGroup = new THREE.Group();
    
    const rightLegGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8);
    const rightLeg = new THREE.Mesh(rightLegGeometry, legMaterial);
    rightLeg.position.set(0, -0.4, 0);
    rightLegGroup.add(rightLeg);
    
    // Right foot
    const rightFootGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.5);
    const rightFoot = new THREE.Mesh(rightFootGeometry, footMaterial);
    rightFoot.position.set(0, -0.825, 0.1);
    rightLegGroup.add(rightFoot);
    
    rightLegGroup.position.set(0.4, 0, 0.3); // Adjusted Z position
    this.condorGroup.add(rightLegGroup);
  }
  
  // Wing animation when turning left
  turnLeft() {
    if (!this.leftWingGroup || !this.rightWingGroup) return;
    
    // When turning left, tilt the wing groups
    this.leftWingGroup.rotation.z = Math.min(
      this.leftWingGroup.rotation.z + this.WING_ROTATE_SPEED,
      this.MAX_WING_ROTATION
    );
    
    this.rightWingGroup.rotation.z = Math.min(
      this.rightWingGroup.rotation.z + this.WING_ROTATE_SPEED,
      this.MAX_WING_ROTATION
    );
    
    // Tilt the entire condor model to the left when turning
    this.condorGroup.rotation.z = Math.min(
      this.condorGroup.rotation.z + this.WING_ROTATE_SPEED * 0.8,
      this.MAX_WING_ROTATION * 0.8
    );
  }
  
  // Wing animation when turning right
  turnRight() {
    if (!this.leftWingGroup || !this.rightWingGroup) return;
    
    // When turning right, tilt the wing groups
    this.leftWingGroup.rotation.z = Math.max(
      this.leftWingGroup.rotation.z - this.WING_ROTATE_SPEED,
      -this.MAX_WING_ROTATION
    );
    
    this.rightWingGroup.rotation.z = Math.max(
      this.rightWingGroup.rotation.z - this.WING_ROTATE_SPEED,
      -this.MAX_WING_ROTATION
    );
    
    // Tilt the entire condor model to the right when turning
    this.condorGroup.rotation.z = Math.max(
      this.condorGroup.rotation.z - this.WING_ROTATE_SPEED * 0.8,
      -this.MAX_WING_ROTATION * 0.8
    );
  }
  
  // Reset wings to level flight
  resetWings() {
    if (!this.leftWingGroup || !this.rightWingGroup) return;
    
    // Gradually return wing groups to neutral position
    if (this.leftWingGroup.rotation.z > 0) {
      this.leftWingGroup.rotation.z = Math.max(
        this.leftWingGroup.rotation.z - this.WING_RESET_SPEED,
        0
      );
    } else if (this.leftWingGroup.rotation.z < 0) {
      this.leftWingGroup.rotation.z = Math.min(
        this.leftWingGroup.rotation.z + this.WING_RESET_SPEED,
        0
      );
    }
    
    if (this.rightWingGroup.rotation.z > 0) {
      this.rightWingGroup.rotation.z = Math.max(
        this.rightWingGroup.rotation.z - this.WING_RESET_SPEED,
        0
      );
    } else if (this.rightWingGroup.rotation.z < 0) {
      this.rightWingGroup.rotation.z = Math.min(
        this.rightWingGroup.rotation.z + this.WING_RESET_SPEED,
        0
      );
    }
    
    // Also gradually reset the condor's roll (z-axis rotation) to level
    if (this.condorGroup.rotation.z > 0) {
      this.condorGroup.rotation.z = Math.max(
        this.condorGroup.rotation.z - this.WING_RESET_SPEED,
        0
      );
    } else if (this.condorGroup.rotation.z < 0) {
      this.condorGroup.rotation.z = Math.min(
        this.condorGroup.rotation.z + this.WING_RESET_SPEED,
        0
      );
    }
  }
  
  // Update pitch based on vertical speed
  updatePitch(verticalSpeed) {
    if (!this.condorGroup || !this.head) return;
    
    // Target pitch angle based on vertical speed
    // Negative vertical speed (descending) = positive pitch (nose down)
    // Positive vertical speed (ascending) = negative pitch (nose up)
    const targetPitch = -verticalSpeed * (this.MAX_PITCH_ANGLE * 10);
    
    // Current pitch
    const currentPitch = this.condorGroup.rotation.x;
    
    // Gradually adjust pitch toward target
    if (Math.abs(targetPitch - currentPitch) > 0.01) {
      if (targetPitch > currentPitch) {
        this.condorGroup.rotation.x += this.PITCH_ADJUSTMENT_SPEED;
      } else {
        this.condorGroup.rotation.x -= this.PITCH_ADJUSTMENT_SPEED;
      }
      
      // Clamp to max values
      this.condorGroup.rotation.x = Math.max(
        Math.min(this.condorGroup.rotation.x, this.MAX_PITCH_ANGLE),
        -this.MAX_PITCH_ANGLE
      );
      
      // Adjust head to exaggerate the pitch effect
      this.head.rotation.x = this.condorGroup.rotation.x * 1.5;
      
      // Also adjust tail feathers for more dynamic look
      if (this.tailFeathers) {
        this.tailFeathers.rotation.x = -this.condorGroup.rotation.x * 1.2;
      }
    }
  }
  
  // Get the condor mesh
  getMesh() {
    return this.condorGroup;
  }
} 