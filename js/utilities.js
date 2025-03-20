// Utility functions for the marble game

// Generate a random number between min and max (inclusive)
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Generate a random integer between min and max (inclusive)
function randomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helpful conversion functions
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Lerp (linear interpolation) between two values
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
} 