/**
 * Adds Three.js primitives to visually debug a Cannon.js physics body.
 * 
 * Based on the Cannon.js debug renderer but optimized and simplified.
 */
class CannonDebugRenderer {
    constructor(scene, world, options) {
        options = options || {};
        
        this.scene = scene;
        this.world = world;
        
        this._meshes = [];
        
        this._material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        
        this._boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        this._sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
        this._planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
        
        this._tmpVec0 = new CANNON.Vec3();
        this._tmpVec1 = new CANNON.Vec3();
        this._tmpVec2 = new CANNON.Vec3();
        this._tmpQuat0 = new CANNON.Quaternion();
    }
    
    update() {
        // Remove old meshes
        while (this._meshes.length > 0) {
            const mesh = this._meshes.pop();
            this.scene.remove(mesh);
        }
        
        // Create new meshes for each body
        this.world.bodies.forEach(body => {
            this._visualizeSingleBody(body);
        });
    }
    
    _visualizeSingleBody(body) {
        body.shapes.forEach((shape, shapeIndex) => {
            let mesh;
            let geometry;
            let material = this._material;
            
            // Special material for static bodies (different color)
            if (body.mass === 0) {
                material = new THREE.MeshBasicMaterial({
                    color: 0xff0000,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                });
            }
            
            // Choose the correct geometry based on shape type
            switch(shape.type) {
                case CANNON.Shape.types.SPHERE:
                    geometry = this._sphereGeometry;
                    break;
                    
                case CANNON.Shape.types.BOX:
                    geometry = this._boxGeometry;
                    break;
                    
                case CANNON.Shape.types.PLANE:
                    geometry = this._planeGeometry;
                    break;
                    
                case CANNON.Shape.types.HEIGHTFIELD:
                    // Create a custom geometry for the heightfield
                    geometry = this._createHeightfieldGeometry(shape);
                    break;
                    
                default:
                    console.warn(`Unhandled shape type: ${shape.type}`);
                    return;
            }
            
            // Create the mesh
            mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);
            this._meshes.push(mesh);
            
            // Position and rotate the mesh
            this._updateMesh(mesh, body, shape, shapeIndex);
        });
    }
    
    _updateMesh(mesh, body, shape, shapeIndex) {
        // Get world position and rotation
        const position = body.position;
        const quaternion = body.quaternion;
        
        // Apply shape offset and rotation
        if (shape.type === CANNON.Shape.types.SPHERE) {
            // Set the sphere size
            const radius = shape.radius;
            mesh.scale.set(radius, radius, radius);
            mesh.position.copy(position);
            mesh.quaternion.copy(quaternion);
        }
        else if (shape.type === CANNON.Shape.types.BOX) {
            // Set the box size
            mesh.scale.set(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2);
            mesh.position.copy(position);
            mesh.quaternion.copy(quaternion);
        }
        else if (shape.type === CANNON.Shape.types.PLANE) {
            // Rotate plane
            mesh.position.copy(position);
            mesh.quaternion.copy(quaternion);
        }
        else if (shape.type === CANNON.Shape.types.HEIGHTFIELD) {
            // Heightfield position and rotation
            mesh.position.copy(position);
            mesh.quaternion.copy(quaternion);
        }
    }
    
    _createHeightfieldGeometry(shape) {
        // Extract the heightfield data
        const data = shape.data;
        const elementSize = shape.elementSize;
        
        // Create a BufferGeometry
        const geometry = new THREE.BufferGeometry();
        
        // Calculate required arrays
        const vertices = [];
        const indices = [];
        
        // Extract vertices from the heightfield data
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
                const x = j * elementSize;
                const y = data[i][j];
                const z = i * elementSize;
                vertices.push(x, y, z);
            }
        }
        
        // Create triangle indices
        for (let i = 0; i < data.length - 1; i++) {
            for (let j = 0; j < data[i].length - 1; j++) {
                const idx00 = i * data[i].length + j;
                const idx10 = (i + 1) * data[i].length + j;
                const idx01 = i * data[i].length + (j + 1);
                const idx11 = (i + 1) * data[i].length + (j + 1);
                
                // Add two triangles
                indices.push(idx00, idx10, idx01);
                indices.push(idx01, idx10, idx11);
            }
        }
        
        // Set the attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        
        // Compute normals for proper lighting
        geometry.computeVertexNormals();
        
        return geometry;
    }
}

// Make available globally
window.CannonDebugRenderer = CannonDebugRenderer; 