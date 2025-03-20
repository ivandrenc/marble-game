# Browser-Based Marble Game

A web-based 3D marble game that runs entirely in the browser, using Three.js for rendering and Cannon.js for physics.

## Game Concept

In this game, you control a marble and attempt to throw it into a shallow hole in the center of a hand-drawn circle on a soil-like surface. The game features:

- Realistic physics for marble rolling and bouncing
- First-person view from the marble's perspective
- Natural terrain with bumps and variations
- 5 marbles to throw, trying to get as close as possible to the center

## How to Play

### Controls

**Desktop:**
- **WASD or Arrow Keys**: Move left/right along a fixed arc around the target
- **Spacebar**: Hold to charge throw power, release to throw the marble
- **Mouse Wheel**: Adjust throw height (up/down)

**Mobile:**
- **Left/Right Buttons**: Move left/right
- **Throw Button**: Hold to charge throw power, release to throw
- **Two-Finger Swipe**: Adjust throw height (up/down)

### Objective

Your goal is to throw marbles and get them to stop as close as possible to the center hole. You have 5 marbles to throw. The game calculates the distance of each marble from the center when it comes to rest.

## Running the Game

Just open the `index.html` file in a modern web browser. No installation or server setup is required. The game works on:

- Desktop computers (Windows, Mac, Linux)
- Mobile devices (iOS, Android)
- Tablets

Note: For the best experience, use a modern browser with good WebGL support like Chrome, Firefox, Safari, or Edge.

## Technical Details

- **Rendering**: Three.js
- **Physics**: Cannon.js
- **Terrain**: Procedurally generated with Perlin noise
- **Mobile Support**: Touch controls with responsive design

## Future Improvements

Potential additions to the game:
- Scoring system based on proximity to the center
- Multiple levels with different terrain types
- Cosmetic customization of marbles
- Multiplayer support

## Credits

Created using:
- [Three.js](https://threejs.org/)
- [Cannon.js](https://schteppe.github.io/cannon.js/)
- [Simplex Noise](https://github.com/jwagner/simplex-noise.js) 