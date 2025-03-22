export default class UIManager {
  constructor() {
    this.elements = {
      altitudeDisplay: null,
      instructions: null,
      loadingElement: null,
      cameraToggleButton: null
    };
    
    // Create UI elements
    this.createLoadingElement();
    this.createAltitudeDisplay();
    this.createInstructions();
    this.createCameraToggleButton();
  }
  
  createLoadingElement() {
    const loadingElement = document.createElement('div');
    loadingElement.style.position = 'absolute';
    loadingElement.style.top = '50%';
    loadingElement.style.left = '50%';
    loadingElement.style.transform = 'translate(-50%, -50%)';
    loadingElement.style.color = 'white';
    loadingElement.style.fontSize = '24px';
    loadingElement.style.fontFamily = 'Arial, sans-serif';
    loadingElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    loadingElement.textContent = 'Loading Chimborazo terrain data...';
    document.body.appendChild(loadingElement);
    
    this.elements.loadingElement = loadingElement;
  }
  
  createAltitudeDisplay() {
    const altitudeDisplay = document.createElement('div');
    altitudeDisplay.style.position = 'absolute';
    altitudeDisplay.style.bottom = '10px';
    altitudeDisplay.style.left = '10px';
    altitudeDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    altitudeDisplay.style.color = 'white';
    altitudeDisplay.style.padding = '5px 10px';
    altitudeDisplay.style.borderRadius = '5px';
    altitudeDisplay.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(altitudeDisplay);
    
    this.elements.altitudeDisplay = altitudeDisplay;
  }
  
  createInstructions() {
    const instructions = document.createElement('div');
    instructions.style.position = 'absolute';
    instructions.style.bottom = '10px';
    instructions.style.right = '10px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    instructions.style.color = 'white';
    instructions.style.padding = '10px';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.borderRadius = '5px';
    instructions.style.pointerEvents = 'none';
    instructions.style.zIndex = '100';
    instructions.innerHTML = `
      <h3 style="margin: 0 0 5px 0;">Controls:</h3>
      <p style="margin: 0 0 3px 0;">Arrow Keys: Turn and adjust speed</p>
      <p style="margin: 0 0 3px 0;">W/S: Ascend/descend</p>
      <p style="margin: 0 0 3px 0;">Mouse/Trackpad: Drag to turn (when enabled)</p>
      <p style="margin: 0 0 3px 0;">C: Toggle mouse camera control</p>
      <p style="margin: 0 0 3px 0;">F: Toggle free camera mode</p>
    `;
    document.body.appendChild(instructions);
    
    this.elements.instructions = instructions;
  }
  
  createCameraToggleButton() {
    const button = document.createElement('button');
    button.style.position = 'absolute';
    button.style.top = '20px';
    button.style.right = '20px';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    button.style.color = 'white';
    button.style.border = '1px solid white';
    button.style.borderRadius = '5px';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.fontSize = '16px';
    button.style.cursor = 'pointer';
    button.textContent = 'Free Camera: OFF';
    
    // Add event listener
    button.addEventListener('click', () => {
      // Simulate pressing F key to toggle camera mode
      const event = new KeyboardEvent('keydown', { key: 'f' });
      window.dispatchEvent(event);
      
      // Update button text
      if (button.textContent === 'Free Camera: OFF') {
        button.textContent = 'Free Camera: ON';
        button.style.backgroundColor = 'rgba(50, 150, 50, 0.7)';
      } else {
        button.textContent = 'Free Camera: OFF';
        button.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      }
    });
    
    document.body.appendChild(button);
    this.elements.cameraToggleButton = button;
  }
  
  updateAltitudeDisplay(position) {
    if (!this.elements.altitudeDisplay) return;
    
    const altitude = Math.round(position.elevation);
    const lat = position.lat.toFixed(4);
    const lng = position.lng.toFixed(4);
    
    this.elements.altitudeDisplay.textContent = `Altitude: ${altitude}m | Position: ${lat}°, ${lng}° | Ecuador - Chimborazo Region`;
  }
  
  updateLoadingProgress(progress) {
    if (!this.elements.loadingElement) return;
    
    this.elements.loadingElement.textContent = `Loading Chimborazo terrain data... ${progress}%`;
  }
  
  removeLoadingElement() {
    if (this.elements.loadingElement && document.body.contains(this.elements.loadingElement)) {
      document.body.removeChild(this.elements.loadingElement);
      this.elements.loadingElement = null;
    }
  }
} 