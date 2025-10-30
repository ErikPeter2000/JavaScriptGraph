# JavaScriptGraph

A simple web-based graph visualiser built with vanilla JavaScript. This project provides an interactive interface for visualising and exploring graph structures in your browser.

## Features

- Interactive graph visualisation
- Vector-based rendering
- Color palette support
- Real-time graph manipulation

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Run the development server:
   ```bash
   bun run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Minimal Example

```js
// Import necessary modules
import { Graph } from "./graph.js";
import { GraphViewer } from "./graph-viewer.js";

// Get the canvas element
const canvas = document.getElementById("canvas");

// Define graph data
const data = {
    nodes: [
        { 
            id: 1, 
            label: "Node 1", 
            position: { x: 100, y: 100 } 
        },
        { 
            id: 2, 
            label: "Node 2", 
            position: { x: 300, y: 100 } 
        },
    ],
    arcs: [
        { fromId: 1, toId: 2 },
    ],
}
const graph = Graph.parseObject(data);

// Create and start the graph viewer
const graphViewer = new GraphViewer(canvas, graph);
graphViewer.startRendering();
```

## Project Structure

- `public/` - Static web assets
  - `index.html` - Main HTML page
  - `graph.js` - Core graph data structures
  - `graph-viewer.js` - Graph visualization components
  - `vector2.js` - 2D vector mathematics
  - `palette.js` - Color palette utilities
- `server.ts` - TypeScript development server

## Development

The project uses TypeScript for the server and vanilla JavaScript for the frontend. The server serves static files from the `public/` directory.
