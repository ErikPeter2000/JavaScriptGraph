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
    get viewPreview(){
        return this.viewPosition.add(this.viewOffset);
    }

    canvasResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
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
        for (let x = -1; x < cellsX+3; x++) {
            let even = x % 2 === 0;
            for (let y = 0; y < cellsY+1; y++) {
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
        addEventListener('contextmenu', (e) => e.preventDefault());
    }
    onMouseDown(event) {
        if (event.button === 0) {
            this.cursorState.mouseDown = true;
            this.cursorState.clickPos = this.cursorState.mousePos.copy();
        }
        else if (event.button === 2){
            this.resetView();
        }
        this.clickSelection();
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
    drag(event){
        if (!this.cursorState.mouseDown) return
        let delta = this.cursorState.mousePos.sub(this.cursorState.clickPos);
        this.viewOffset = delta;
    }
    finaliseDrag(){
        if (this.cursorState.mouseDown) return 
        this.viewPosition = this.viewPosition.add(this.viewOffset);
        this.viewOffset = Vector2.origin();
    }
    resetView(){
        this.viewPosition = Vector2.origin();
        this.infoText.newText("View reset");
    }
    clickSelection() {
        let found = false;
        let relativePos = this.cursorState.mousePos.sub(this.viewPreview);
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
                            this.selection.arcs[0] = id
                            console.log(this.selection.arcs);
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