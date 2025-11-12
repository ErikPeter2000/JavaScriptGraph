// Definitions for handling user interaction.

import { NodeObject, ArcObject, Graph } from "./graph.js";
import { Vector2 } from "./vector2.js";
import { Palette } from "./palette.js";

/** Enum of selection modes. */
class SelectMode {
  static NONE = 0;
  static NODE = 1;
  static ARC = 2;
  static BOTH = 3;
}

/** Handles the display of text on screen. */
class InfoText {
  #fadeInRate = 0.05;
  #fadeOutRate = 0.05;

  constructor(text, pos) {
    this.text = text;
    this.pos = pos;
    this.nextText = null;
    this.fadeState = "off";
    this.alpha = 0;
  }

  draw(canvas, ctx) {
    ctx.save();
    ctx.fillStyle = Palette.UITextColor;
    ctx.font = "20px Arial";
    if (this.fadeState === "in") {
      this.alpha += this.#fadeInRate;
    } else if (this.fadeState === "out") {
      this.alpha -= this.#fadeOutRate;
    }
    if (this.alpha < 0) {
      this.alpha = 0;
      this.fadeState = "in";
      this.text = this.nextText || "Error";
    } else if (this.alpha > 1) {
      this.alpha = 1;
      this.fadeState = "off";
    }
    ctx.globalAlpha = this.alpha;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(this.text, this.pos.x, canvas.height - this.pos.y);
    ctx.restore();
  }

  newText(text) {
    this.nextText = text;
    this.fadeState = "out";
  }
}

/** Handles visualisation of the graph */
export class GraphViewer {
  #gridSize = 10;
  #originView = new Vector2(0, 0);
  #centerScreen = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
  #lastTime = 0;
  #zoomFactor = 1.1;

  constructor(canvas, graph) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvasResize();
    this.viewPosition = this.#originView.copy();
    this.viewOffset = new Vector2(0, 0);
    this.viewScale = 1;
    this.graph = graph || new Graph();
    this.rendering = false;
    this.currentId = 0;
    this.cursorState = {
      mouseDown: false,
      mousePos: new Vector2(20, 20),
      clickPos: new Vector2(0, 0),
      selectMode: SelectMode.BOTH,
    };
    this.selection = {
      nodes: [],
      arcs: []
    }
    this.targetView = this.viewPosition.copy();
    this.targetViewScale = this.viewScale;
    this.infoText = new InfoText("", new Vector2(10, 30));
    this.setupListeners();
    this.zoomMode = "none";
    this.infoText.newText("Welcome to Graph Viewer!");
    this.eventTarget = new EventTarget();
  }
  get viewPreview() {
    return this.viewPosition.add(this.viewOffset);
  }
  get dpr() {
    return window.devicePixelRatio || 1;
  }

  addEventListener(type, listener) {
    this.eventTarget.addEventListener(type, listener);
  }
  removeEventListener(type, listener) {
    this.eventTarget.removeEventListener(type, listener);
  }
  canvasResize() {
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;
    this.#centerScreen = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
  }
  findNodeByLabel(label) {
    let id = null;
    for (let nodeId in this.graph.nodeData) {
      if (this.graph.nodeData[nodeId].label === label) {
        id = nodeId;
        break;
      }
    }
    return id;
  }
  focusNodeLabel(label) {
    let id = this.findNodeByLabel(label);
    this.focusNode(id);
  }
  focusNode(id) {
    if (this.graph.nodeData[id]) {
      let node = this.graph.nodeData[id];
      this.targetView = node.position.copy().negative();
      this.targetViewScale = 1;
      this.infoText.newText(`Focusing on ${node.label}`);
    }
  }
  #raiseSelectionChanged() {
    if (this.selection.nodes.length === 0) {
      let event = new CustomEvent('selectionchanged', { detail: { id: null, label: null }, bubbles: true });
      this.eventTarget.dispatchEvent(event);
    } else {
      let node = this.graph.nodeData[this.selection.nodes[0].id];
      let event = new CustomEvent('selectionchanged', { detail: { id: this.selection.nodes[0].id, label: node.label }, bubbles: true });
      this.eventTarget.dispatchEvent(event);
    }
  }
  recalculatePositions() {
    let pad = new Vector2(30, 30);
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    for (let nodeId in this.graph.nodeData) {
      let node = this.graph.nodeData[nodeId];
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x);
      maxY = Math.max(maxY, node.position.y);
    }
    let width = maxX - minX + 2 * pad.x;
    let height = maxY - minY + 2 * pad.y;
    let scale = new Vector2(this.canvas.width / width, this.canvas.height / height);
    for (let nodeId in this.graph.nodeData) {
      let node = this.graph.nodeData[nodeId];
      node.position.x = (node.position.x - minX) * scale.x + pad.x;
      node.position.y = (node.position.y - minY) * scale.y + pad.y;
    }
  }
  lerpTarget(factor = 0.2) {
    function lerp(a, b, t) {
      return a + (b - a) * t;
    }
    this.viewScale = lerp(this.viewScale, this.targetViewScale, factor);
    let target = this.targetView.copy();
    let newX = lerp(this.viewPosition.x, target.x, factor);
    let newY = lerp(this.viewPosition.y, target.y, factor);
    this.viewPosition = new Vector2(newX, newY);
  }

  #smoothNStep(t, n) {
    return 1 / (1 + Math.exp(-n * (t - 0.5)))
  }

  #drawHex(scale, opacity = 1, color = Palette.gridColor) {
    const r3 = Math.sqrt(3);
    const r32 = r3 / 2;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = opacity;
    const absoluteScale = this.viewScale * scale;

    const gridSizeX = this.#gridSize * 1.5 * absoluteScale;
    const gridSizeY = this.#gridSize * r3 * absoluteScale;

    const worldPos = this.viewPreview;

    const offsetX = worldPos.x;
    const offsetY = worldPos.y;

    const startGridX = Math.floor(-offsetX / gridSizeX) - 2;
    const startGridY = Math.floor(-offsetY / gridSizeY) - 2;

    const cellsX = Math.ceil(this.canvas.width / gridSizeX) + 4;
    const cellsY = Math.ceil(this.canvas.height / gridSizeY) + 4;

    this.ctx.beginPath();
    for (let x = startGridX; x < startGridX + cellsX; x++) {
      let even = x % 2 === 0;
      for (let y = startGridY; y < startGridY + cellsY; y++) {
        let worldX = x * gridSizeX;
        let worldY = y * gridSizeY + (even ? 0 : r32 * this.#gridSize * absoluteScale);

        let cx = worldX + offsetX;
        let cy = worldY + offsetY;

        this.ctx.moveTo(cx, cy + this.#gridSize * r32 * absoluteScale);
        this.ctx.lineTo(cx + this.#gridSize * 0.5 * absoluteScale, cy);
        this.ctx.lineTo(cx + this.#gridSize * 1.5 * absoluteScale, cy);
        this.ctx.lineTo(cx + this.#gridSize * 2 * absoluteScale, cy + this.#gridSize * r32 * absoluteScale);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }
  #floorMod(x, y) {
    return x - y * Math.floor(x / y);
  }
  drawBackground() {
    this.ctx.fillStyle = Palette.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const base = 9.0;
    const exponent = Math.log(this.viewScale) / Math.log(this.#zoomFactor * 10);
    const floorExponent = Math.floor(exponent);
    const remainder = this.#floorMod(exponent, 1);
    const scale = Math.pow(base, -floorExponent);

    const mix1 = this.#smoothNStep(remainder, 10);
    const mix2 = this.#smoothNStep(1 - remainder, 10);
    this.#drawHex(scale, mix1);
    this.#drawHex(scale * base, mix2);
  }
  drawGraph() {
    this.ctx.save();
    let pos = this.viewPosition.add(this.viewOffset);
    this.ctx.translate(pos.x, pos.y);
    this.ctx.scale(this.viewScale, this.viewScale);
    this.ctx.translate(this.#centerScreen.x, this.#centerScreen.y);
    this.graph = ForceDirectedGraphCalculator.repositionNodes(this.graph, this.canvas.width, this.canvas.height, 2, this.selection.nodes.map(n => n.id));
    //this.recalculatePositions();
    this.graph.draw(this.canvas, this.ctx, this.selection);
    this.ctx.restore();
  }
  renderFrame(e) {
    let deltaTime = e - this.#lastTime;
    this.#lastTime = e;
    if (this.rendering) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.lerpTarget();
      this.drawBackground(this.canvas, this.ctx);
      this.drawGraph();
      this.infoText.draw(this.canvas, this.ctx);
      requestAnimationFrame((e) => this.renderFrame(e));
    }
  }
  startRendering() {
    this.rendering = true;
    this.renderFrame(this.#lastTime);
  }
  stopRendering() {
    this.rendering = false;
  }

  // graph operations
  addNode(node) {
    this.graph.addNode(this.currentId, node);
    return this.currentId++;
  }
  addArc(idFrom, idTo) {
    let arc = new ArcData({ idFrom, idTo });
    this.graph.addArc(arc);
    return arc;
  }
  // input
  isTablet() {
    return /iPad|Android|Touch/.test(navigator.userAgent) && !window.MSStream;
  }
  setupListeners(forceTablet = false) {
    if (this.isTablet() || forceTablet) {
      this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
      this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
      this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
    } else {
      this.canvas.addEventListener('keydown', (e) => this.onKeyDown(e));
      this.canvas.addEventListener('keyup', (e) => this.onKeyUp(e));
      this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
      this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
      this.canvas.addEventListener('wheel', (e) => this.onScroll(e));
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      addEventListener('mouseup', (e) => this.onMouseUp(e));
    }
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    addEventListener('resize', () => this.canvasResize());
    this.canvas.focus();
  }
  onKeyDown(event) {
    switch (event.key) {
      case "1":
        this.toggleSelectMode(SelectMode.NODE, "Selecting nodes");
        break;
      case "2":
        this.toggleSelectMode(SelectMode.ARC, "Selecting arcs");
        break;
      case "3":
        this.toggleSelectMode(SelectMode.BOTH, "Selecting both");
        break;
      case "0":
        this.toggleSelectMode(SelectMode.NONE, "Selecting nothing");
        break;
      case "Control":
        this.ctrl = true;
    }
  }
  onKeyUp(event) {
    if (event.key === "Control") {
      this.ctrl = false;
    }
  }
  toggleSelectMode(mode, infoText) {
    if (this.cursorState.selectMode === mode) {
      this.cursorState.selectMode = SelectMode.NONE;
      this.infoText.newText("Selecting nothing");
    } else {
      this.cursorState.selectMode = mode;
      this.infoText.newText(infoText);
    }
  }
  onMouseDown(event) {
    if (event.button === 0) {
      this.cursorState.mouseDown = true;
      this.cursorState.mousePos = new Vector2(event.clientX * this.dpr, event.clientY * this.dpr);
      this.cursorState.clickPos = this.cursorState.mousePos.copy();
    }
    else if (event.button === 2) {
      this.resetView();
    }
    this.cursorState.clickNode = this.clickSelection();
  }
  onTouchStart(event) {
    if (event.touches.length === 2) {
      this.cursorState.lastDistance = null;
    }
    else if (event.touches.length === 1) {
      this.cursorState.mouseDown = true;
      this.cursorState.mousePos = new Vector2(event.touches[0].clientX * this.dpr, event.touches[0].clientY * this.dpr);
      this.cursorState.clickPos = this.cursorState.mousePos.copy();
      this.cursorState.clickNode = this.clickSelection();
    }
  }
  onScroll(event) {
    if (this.ctrl) { return; } // don't zoom if page is zoomed
    let delta = event.deltaY;
    let scaleChange;
    if (delta > 0) {
      this.zoomMode = "out";
      scaleChange = 1 / this.#zoomFactor;
    } else {
      this.zoomMode = "in";
      scaleChange = this.#zoomFactor;
    }
    let cursorPosition = new Vector2(event.clientX * this.dpr, event.clientY * this.dpr);
    let direction = cursorPosition.sub(this.viewPosition);
    this.setView({ target: this.viewPosition.add(direction.mul(1 - scaleChange)), scale: this.viewScale * scaleChange });
  }
  onDoubleClick(event) {
    if (this.selection.nodes.length > 0) {
      let selected = this.selection.nodes[0];
      this.focusNode(selected.id);
    }
    event.preventDefault();
  }
  onMouseUp(event) {
    if (event.button === 0) {
      this.cursorState.mouseDown = false;
      this.finaliseDrag();
    }
  }
  onTouchEnd(event) {
    this.cursorState.mouseDown = false;
    this.finaliseDrag();
  }
  onMouseMove(event) {
    this.cursorState.mousePos = new Vector2(event.clientX * this.dpr, event.clientY * this.dpr);
    this.drag();
  }
  onTouchMove(event) {
    if (event.touches.length === 2) {
      let dx = event.touches[0].clientX * this.dpr - event.touches[1].clientY * this.dpr;
      let dy = event.touches[0].clientX * this.dpr - event.touches[1].clientY * this.dpr;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (this.cursorState.lastDistance) {
        if (distance !== this.cursorState.lastDistance) {
          let scale = distance / this.cursorState.lastDistance;
          let cursorPosition = new Vector2(event.touches[0].clientX, event.touches[0].clientY);
          let direction = cursorPosition.sub(this.viewPosition);
          this.setView({ target: this.viewPosition.add(direction.mul(1 - scale)), scale: this.viewScale * scale });
        }
      }
      this.cursorState.lastDistance = distance;
    }
    else if (event.touches.length === 1) {
      this.cursorState.mousePos = new Vector2(event.touches[0].clientX * this.dpr, event.touches[0].clientY * this.dpr);
      this.drag();
    }
  }
  drag() {
    if (!this.cursorState.mouseDown) return
    this.infoText.newText(` `);
    if (this.cursorState.clickNode) {
      for (let node of this.selection.nodes) {
        let newPosition = this.cursorState.mousePos.sub(this.cursorState.clickPos).div(this.viewScale).add(node.position);
        this.graph.nodeData[node.id].position = newPosition;
      }
    } else {
      let delta = this.cursorState.mousePos.sub(this.cursorState.clickPos);
      this.viewOffset = delta;
    }
  }
  finaliseDrag() {
    if (this.cursorState.mouseDown) return
    this.setView({ target: this.viewPosition.add(this.viewOffset) });
  }
  setView({ target, scale }) {
    if (target) {
      this.viewPosition = target;
      this.viewOffset = Vector2.origin();
      this.targetView = target;
    }
    if (scale) {
      this.viewScale = scale;
      this.targetViewScale = scale;
    }
  }
  resetView() {
    this.setView({ target: this.#originView.copy(), scale: 1 });
    this.infoText.newText("View reset");
  }
  clickSelection() {
    let found = false;
    let nodeSelected = false;
    let relativePos = this.cursorState.mousePos.sub(this.viewPreview).div(this.viewScale).sub(this.#centerScreen);
    if (this.cursorState.selectMode & SelectMode.NODE) {
      for (let nodeId in this.graph.nodeData) {
        if (this.graph.nodeData[nodeId].isClicked(relativePos) && !this.selection.nodes.includes(nodeId)) {
          this.selection.nodes[0] = { id: nodeId, position: this.graph.nodeData[nodeId].position.copy() }
          this.selection.arcs = [];
          found = true;
          nodeSelected = true;
          this.#raiseSelectionChanged();
          break;
        }
      }
    }
    if (!found) {
      this.selection.nodes = []; {
        if (this.cursorState.selectMode & SelectMode.ARC) {
          for (let arc of this.graph.arcData) {
            let id = { fromId: arc.fromId, toId: arc.toId };
            if (arc.isClicked(relativePos, this.graph) && !this.selection.arcs.includes(id)) {
              this.selection.arcs[0] = id;
              found = true;
              break;
            }
          }
        }
      }
    }
    if (!found) {
      this.selection.arcs = [];
    }
    return nodeSelected;
  }
}

/**
 * Calculates a physics simulation for the nodes and arcs.
 * https://en.wikipedia.org/wiki/Force-directed_graph_drawing
 */
export class ForceDirectedGraphCalculator {
  static #iterations = 10;
  static #idealDistance = 200;
  static #forceConstant = 0.5;
  static #repulsionConstant = 0.000001;
  static #repulsionDistance = 100;
  static #gravityConstant = 0.0006;
  static #maxForce = 100;
  static repositionNodes(graph, width, height, iterations, fixedIds = []) {
    let newPositions = new Map();
    iterations = iterations ?? this.#iterations;
    for (let i = 0; i < iterations; i++) {
      // Calculate forces
      for (let nodeId in graph.nodeData) {
        if (fixedIds.includes(nodeId)) continue;
        let node = graph.nodeData[nodeId];
        let force = Vector2.origin();
        let neighbours = graph.getNeighbours(nodeId, true);
        for (let otherId of neighbours) {
          let other = graph.nodeData[otherId];
          let delta = other.position.sub(node.position);
          let distance = delta.length - this.#idealDistance;

          force = force.add(delta.normalise().mul(Math.min(this.#forceConstant * distance, this.#maxForce)));
        }
        // Repulsion forces
        for (let otherId in graph.nodeData) {
          if (nodeId === otherId) continue;
          let other = graph.nodeData[otherId];
          let delta = other.position.sub(node.position);
          let distance = Math.max(delta.length, 0.1) / this.#repulsionDistance;
          force = force.sub(delta.mul(Math.min(this.#idealDistance * this.#idealDistance / distance / distance * this.#repulsionConstant, this.#maxForce)));
          force = force.add(new Vector2(0, 0).sub(node.position).mul(this.#gravityConstant));
        }
        newPositions.set(nodeId, node.position.add(force));
      }
      // apply positions
      for (let nodeId of newPositions.keys()) {
        graph.nodeData[nodeId].position = newPositions.get(nodeId);
      }
    }
    return graph;
  }
}