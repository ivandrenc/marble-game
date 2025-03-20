// Main entry point for the marble game
console.log("Main.js loaded");

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing game...");
    
    // Add a retry button if needed
    let retryButton = null;
    
    // Function to start the game
    function startGame() {
        // Remove any existing error messages or retry buttons
        if (retryButton) {
            retryButton.remove();
            retryButton = null;
        }
        
        const errorContainers = document.querySelectorAll('.error-container');
        errorContainers.forEach(container => container.remove());
        
        try {
            // Check that THREE.js is loaded
            if (typeof THREE === 'undefined') {
                showError("THREE.js library not found! Make sure lib/three.min.js exists.");
                return;
            }
            console.log("THREE.js is available");
            
            // Check that CANNON.js is loaded
            if (typeof CANNON === 'undefined') {
                showError("CANNON.js physics library not found! Make sure lib/cannon.min.js exists.");
                return;
            }
            console.log("CANNON.js is available");
            
            // Check for WebGL support
            if (!hasWebGL()) {
                showError("WebGL is not supported in your browser! Please try a different browser.");
                return;
            }
            console.log("WebGL is supported");
            
            // Set up the game
            console.log("Starting game initialization");
            window.game = new Game();
            
            // Handle mobile controls
            setupMobileControls();
            
            console.log("Game initialized successfully");
            
            // Hide loading message
            const loadingEl = document.getElementById('loading');
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
        } catch (error) {
            console.error("Error initializing game:", error);
            showError("Failed to initialize game: " + error.message, true);
        }
    }
    
    // Function to check for WebGL support
    function hasWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(
                window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch (e) {
            return false;
        }
    }
    
    // Display error message
    function showError(message, canRetry = false) {
        console.error(message);
        
        // Create error container if not exists
        let errorContainer = document.querySelector('.error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'error-container';
            errorContainer.style.position = 'absolute';
            errorContainer.style.top = '50%';
            errorContainer.style.left = '50%';
            errorContainer.style.transform = 'translate(-50%, -50%)';
            errorContainer.style.padding = '20px';
            errorContainer.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            errorContainer.style.color = 'white';
            errorContainer.style.fontFamily = 'Arial, sans-serif';
            errorContainer.style.fontSize = '18px';
            errorContainer.style.textAlign = 'center';
            errorContainer.style.borderRadius = '10px';
            errorContainer.style.maxWidth = '80%';
            errorContainer.style.zIndex = '1000';
            document.body.appendChild(errorContainer);
        }
        
        // Set error message
        errorContainer.innerHTML = message;
        
        // Add retry button if needed
        if (canRetry) {
            retryButton = document.createElement('button');
            retryButton.textContent = 'Try Again';
            retryButton.style.marginTop = '20px';
            retryButton.style.padding = '10px 20px';
            retryButton.style.fontSize = '16px';
            retryButton.style.cursor = 'pointer';
            retryButton.addEventListener('click', startGame);
            errorContainer.appendChild(document.createElement('br'));
            errorContainer.appendChild(retryButton);
        }
        
        // Hide loading message
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }
    
    // Set up mobile controls (touch-based)
    function setupMobileControls() {
        // Only add mobile controls if on a mobile device
        if (!isMobile()) return;
        
        console.log("Setting up mobile controls");
        
        const mobileControlsContainer = document.createElement('div');
        mobileControlsContainer.id = 'mobile-controls';
        mobileControlsContainer.style.position = 'absolute';
        mobileControlsContainer.style.bottom = '20px';
        mobileControlsContainer.style.left = '0';
        mobileControlsContainer.style.width = '100%';
        mobileControlsContainer.style.display = 'flex';
        mobileControlsContainer.style.justifyContent = 'space-between';
        mobileControlsContainer.style.padding = '0 20px';
        mobileControlsContainer.style.boxSizing = 'border-box';
        mobileControlsContainer.style.zIndex = '100';
        
        // Create direction controls (left, right)
        const directionControls = document.createElement('div');
        directionControls.style.display = 'flex';
        directionControls.style.gap = '20px';
        
        // Left button
        const leftButton = createMobileButton('←', () => {
            if (window.game && window.game.player) {
                window.game.player.moveLeft();
            }
        });
        
        // Right button
        const rightButton = createMobileButton('→', () => {
            if (window.game && window.game.player) {
                window.game.player.moveRight();
            }
        });
        
        directionControls.appendChild(leftButton);
        directionControls.appendChild(rightButton);
        
        // Create height controls (up, down)
        const heightControls = document.createElement('div');
        heightControls.style.display = 'flex';
        heightControls.style.flexDirection = 'column';
        heightControls.style.gap = '10px';
        
        // Up button
        const upButton = createMobileButton('↑', () => {
            if (window.game && window.game.player) {
                window.game.player.increaseHeight();
            }
        });
        
        // Down button
        const downButton = createMobileButton('↓', () => {
            if (window.game && window.game.player) {
                window.game.player.decreaseHeight();
            }
        });
        
        heightControls.appendChild(upButton);
        heightControls.appendChild(downButton);
        
        // Create throw button
        const actionControls = document.createElement('div');
        
        const throwButton = createMobileButton('THROW', () => {
            if (window.game && window.game.player) {
                if (!window.game.player.isCharging && 
                    window.game.player.activeMarble === null &&
                    window.game.player.remainingMarbles > 0) {
                    
                    // Start charging
                    window.game.player.startCharging();
                    
                    // Throw after a delay
                    setTimeout(() => {
                        if (window.game.player.isCharging) {
                            window.game.player.throwMarble();
                        }
                    }, 1000);
                }
            }
        }, '80px', '80px');
        
        throwButton.style.borderRadius = '50%';
        throwButton.style.fontSize = '14px';
        
        actionControls.appendChild(throwButton);
        
        // Add all controls to the container
        mobileControlsContainer.appendChild(directionControls);
        mobileControlsContainer.appendChild(actionControls);
        mobileControlsContainer.appendChild(heightControls);
        
        // Add to document
        document.body.appendChild(mobileControlsContainer);
        
        console.log("Mobile controls set up");
    }
    
    // Helper to create mobile buttons
    function createMobileButton(text, callback, width = '50px', height = '50px') {
        const button = document.createElement('div');
        button.textContent = text;
        button.style.width = width;
        button.style.height = height;
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        button.style.border = '2px solid white';
        button.style.borderRadius = '10px';
        button.style.color = 'white';
        button.style.textShadow = '1px 1px 3px rgba(0, 0, 0, 0.5)';
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';
        button.style.fontSize = '24px';
        button.style.fontWeight = 'bold';
        button.style.cursor = 'pointer';
        button.style.userSelect = 'none';
        
        // Handle touch events
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            callback();
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        });
        
        return button;
    }
    
    // Check if device is mobile
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Start the game
    startGame();
}); 