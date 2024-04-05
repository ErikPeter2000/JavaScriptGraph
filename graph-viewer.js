import { NodeData, ArcData, Graph } from './graph.js';
import { Vector2 } from './vector2.js';
import { Palette } from './palette.js';

class SelectMode {
    static NONE = 0;
    static NODE = 1;
    static ARC = 2;
    static BOTH = 3;
}

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
        }
        else if (this.alpha > 1) {
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

export class GraphViewer {
    #gridSize = 20;

    constructor(canvas, graph) {
        this.viewPosition = new Vector2(0, 0);
        this.viewOffset = new Vector2(0, 0);
        this.viewScale = 1;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
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
        this.infoText = new InfoText("", new Vector2(10, 30));
        this.setupListeners();
        this.canvasResize();
        this.infoText.newText("Welcome to Graph Viewer!");
    }
    get viewPreview() {
        return this.viewPosition.add(this.viewOffset);
    }

    canvasResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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

    // graphics
    drawBackground() {
        const r3 = Math.sqrt(3);
        const r32 = r3 / 2;
        this.ctx.fillStyle = Palette.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = Palette.gridColor;
        this.ctx.lineWidth = 1;
        let cellsX = Math.ceil(this.canvas.width / this.#gridSize / 1.5);
        let startX = this.viewPreview.x % (this.#gridSize * 3) - this.#gridSize * 3;
        let cellsY = Math.ceil(this.canvas.height / this.#gridSize / r3);
        let startY = this.viewPreview.y % (this.#gridSize * r3) - this.#gridSize * r3;
        this.ctx.beginPath();
        for (let x = -1; x < cellsX + 3; x++) {
            let even = x % 2 === 0;
            for (let y = 0; y < cellsY + 1; y++) {
                let cx = x * 1.5 * this.#gridSize + startX;
                let cy = y * r3 * this.#gridSize + (even ? 0 : r32 * this.#gridSize) + startY;
                this.ctx.moveTo(cx, cy + this.#gridSize * r32);
                this.ctx.lineTo(cx + this.#gridSize * 0.5, cy);
                this.ctx.lineTo(cx + this.#gridSize * 1.5, cy);
                this.ctx.lineTo(cx + this.#gridSize * 2, cy + this.#gridSize * r32);
            }
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }
    drawGraph() {
        this.ctx.save();
        let pos = this.viewPosition.add(this.viewOffset);
        this.ctx.translate(pos.x, pos.y);
        this.ctx.scale(this.viewScale, this.viewScale);
        this.graph = ForceDirectedGraphCalculator.repositionNodes(this.graph, this.canvas.width, this.canvas.height, 10);
        //this.recalculatePositions();
        this.graph.draw(this.canvas, this.ctx, this.selection);
        this.ctx.restore();
    }
    renderFrame() {
        if (this.rendering) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawBackground(this.canvas, this.ctx);
            this.drawGraph();
            this.infoText.draw(this.canvas, this.ctx);
            requestAnimationFrame(() => this.renderFrame());
        }
    }
    startRendering() {
        this.rendering = true;
        this.renderFrame();
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
    setupListeners() {
        addEventListener('mousedown', (e) => this.onMouseDown(e));
        addEventListener('mouseup', (e) => this.onMouseUp(e));
        addEventListener('mousemove', (e) => this.onMouseMove(e));
        addEventListener('resize', () => this.canvasResize());
        addEventListener('keydown', (e) => this.onKeyDown(e));
        addEventListener('wheel', (e) => this.onScroll(e));
        addEventListener('contextmenu', (e) => e.preventDefault());
    }
    onMouseDown(event) {
        if (event.button === 0) {
            this.cursorState.mouseDown = true;
            this.cursorState.clickPos = this.cursorState.mousePos.copy();
        }
        else if (event.button === 2) {
            this.resetView();
        }
        this.clickSelection();
    } 
    onScroll(event) {
        let delta = event.deltaY;
        let scaleChange;
        if (delta > 0) {
            scaleChange = 0.9;
        } else {
            scaleChange = 1.1;
        }
        let cursorPosition = new Vector2(event.clientX, event.clientY);
        let direction = cursorPosition.sub(this.viewPosition);
        this.viewPosition = this.viewPosition.add(direction.mul(1 - scaleChange));
        this.viewScale *= scaleChange;
    }
    onMouseUp(event) {
        if (event.button === 0) {
            this.cursorState.mouseDown = false;
            this.finaliseDrag();
        }
    }
    onKeyDown(event) {
        if (event.key === '1') {
            this.cursorState.selectMode = SelectMode.NODE;
            this.infoText.newText("Selecting nodes");
        } else if (event.key === '2') {
            this.cursorState.selectMode = SelectMode.ARC;
            this.infoText.newText("Selecting arcs");
        } else if (event.key === '3') {
            this.cursorState.selectMode = SelectMode.BOTH;
            this.infoText.newText("Selecting both arcs and nodes");
        }
    }
    onMouseMove(event) {
        this.cursorState.mousePos = new Vector2(event.clientX, event.clientY);
        this.drag(event);
    }
    drag(event) {
        if (!this.cursorState.mouseDown) return
        let delta = this.cursorState.mousePos.sub(this.cursorState.clickPos);
        this.viewOffset = delta;
    }
    finaliseDrag() {
        if (this.cursorState.mouseDown) return
        this.viewPosition = this.viewPosition.add(this.viewOffset);
        this.viewOffset = Vector2.origin();
    }
    resetView() {
        this.viewPosition = Vector2.origin();
        this.viewOffset = Vector2.origin();
        this.viewScale = 1;
        this.infoText.newText("View reset");
    }
    clickSelection() {
        let found = false;
        let relativePos = this.cursorState.mousePos.sub(this.viewPreview).div(this.viewScale);
        if (this.cursorState.selectMode & SelectMode.NODE) {
            for (let nodeId in this.graph.nodeData) {
                if (this.graph.nodeData[nodeId].isClicked(relativePos) && !this.selection.nodes.includes(nodeId)) {
                    this.selection.nodes[0] = nodeId;
                    found = true;
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
        else
            this.selection.arcs = [];
    }
}

export class ForceDirectedGraphCalculator {
    static #iterations = 100;
    static #idealDistance = 200;
    static #forceConstant = 0.1;
    static #repulsionConstant = 0.002;
    static #gravityConstant = 0.0001;
    static repositionNodes(graph, width, height, iterations) {
        let newPositions = new Map();
        iterations = iterations || this.#iterations;
        for (let i = 0; i < iterations; i++) {
            // Calculate forces
            for (let nodeId in graph.nodeData) {
                let node = graph.nodeData[nodeId];
                let force = Vector2.origin();
                for (let otherId of graph.getNeighbours(nodeId)) {
                    if (nodeId === otherId) continue;
                    let other = graph.nodeData[otherId];
                    let delta = other.position.sub(node.position);
                    let distance = delta.length - this.#idealDistance;

                    force = force.add(delta.normalise().mul(this.#forceConstant * distance));
                }
                // Repulsion forces
                for (let otherId in graph.nodeData) {
                    if (nodeId === otherId) continue;
                    let other = graph.nodeData[otherId];
                    let delta = other.position.sub(node.position);
                    let distance = Math.max(delta.length, 0.1);
                    // repulsion
                    //if (distance < this.#idealDistance)
                    force = force.sub(delta.mul(this.#idealDistance * this.#idealDistance / distance / distance * this.#repulsionConstant));
                    // gravity
                    force = force.add(new Vector2(width / 2, height / 2).sub(node.position).mul(this.#gravityConstant));
                }
                newPositions.set(nodeId, node.position.add(force));
            }
        }
        // apply positions
        for (let nodeId of newPositions.keys()) {
            graph.nodeData[nodeId].position = newPositions.get(nodeId);
        }
        return graph;
    }
}