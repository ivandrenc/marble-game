// Utility functions for the marble game

// Convert degrees to radians
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Linear interpolation function
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Generate a random number between min and max
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Convert from Cartesian to Polar coordinates
function cartesianToPolar(x, z) {
    const r = Math.sqrt(x * x + z * z);
    const theta = Math.atan2(z, x);
    return { r, theta };
}

// Convert from Polar to Cartesian coordinates
function polarToCartesian(r, theta) {
    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);
    return { x, z };
}

// Create a color from HSL values
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Generate a perlin noise value at x, y
// Updated to work with modern simplex-noise library
function perlinNoise(noise, x, y, scale = 1, octaves = 1, persistence = 0.5, lacunarity = 2) {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        // Modern simplex-noise library takes x, y directly
        value += amplitude * noise(x * frequency, y * frequency);
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    
    return value / maxValue;
}

// Generate a random color
function randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

// Simple Perlin noise implementation
var noise = {
    // Set randomization seed
    seed: function(seed) {
        this._seed = seed || Math.random();
        this._p = new Array(512);
        this._perm = new Array(512);
        
        // Initialize the permutation
        for (let i = 0; i < 256; i++) {
            this._p[i] = Math.floor(this._seed * 10000) % 256;
            this._p[i + 256] = this._p[i];
        }
        
        // Create the permutation table
        for (let i = 0; i < 512; i++) {
            this._perm[i] = this._p[i & 255];
        }
    },
    
    // Get a 2D simplex noise value
    simplex2: function(x, y) {
        // Noise contributions from the three corners
        let n0, n1, n2;
        
        // Skew the input space to determine which simplex cell we're in
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        const t = (i + j) * G2;
        
        // Unskew the cell origin back to (x,y) space
        const X0 = i - t;
        const Y0 = j - t;
        
        // The x,y distances from the cell origin
        const x0 = x - X0;
        const y0 = y - Y0;
        
        // Determine which simplex we are in
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }
        
        // Offsets for corners
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        
        // Work out the hashed gradient indices of the three simplex corners
        const ii = i & 255;
        const jj = j & 255;
        
        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0.0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * this._grad(this._perm[ii + this._perm[jj]], x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0.0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * this._grad(this._perm[ii + i1 + this._perm[jj + j1]], x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0.0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * this._grad(this._perm[ii + 1 + this._perm[jj + 1]], x2, y2);
        }
        
        // Add contributions from each corner to get the final noise value
        // The result is scaled to return values in the interval [-1, 1]
        return 70.0 * (n0 + n1 + n2);
    },
    
    // Helper function for gradients
    _grad: function(hash, x, y) {
        // Convert low 3 bits of hash code into 8 gradient directions
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
};

// Detect WebGL support
function isWebGLAvailable() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch(e) {
        return false;
    }
}

// Check if we're on mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Format number to fixed decimal places
function formatNumber(num, decimals = 2) {
    return Number(num).toFixed(decimals);
}

// Calculate distance between two points
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Simple FPS counter
class FPSCounter {
    constructor() {
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 0;
    }
    
    update() {
        this.frames++;
        const now = performance.now();
        const delta = now - this.lastTime;
        
        if (delta >= 1000) {
            this.fps = Math.round(this.frames * 1000 / delta);
            this.lastTime = now;
            this.frames = 0;
        }
        
        return this.fps;
    }
}

// Expose to window object for global use
window.degToRad = degToRad;
window.clamp = clamp;
window.lerp = lerp;
window.random = random;
window.cartesianToPolar = cartesianToPolar;
window.polarToCartesian = polarToCartesian;
window.hslToHex = hslToHex;
window.perlinNoise = perlinNoise;
window.randomColor = randomColor;
window.noise = noise;
window.isWebGLAvailable = isWebGLAvailable;
window.isMobile = isMobile;
window.formatNumber = formatNumber;
window.distance = distance;
window.FPSCounter = FPSCounter; 