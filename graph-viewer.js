import { NodeData, ArcData, Graph } from './graph.js';
import { Vector2 } from './vector2.js';
import { Palette } from './palette.js';

export class GraphViewer{
    #gridSize = 20;
    
    constructor(canvas, graph){
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.graph = graph || new Graph();
        this.rendering = false;
        this.currentId = 0;
        addEventListener('resize', () => this.canvasResize());
        this.canvasResize();
    }
    
    canvasResize(){
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // graphics
    drawBackground(){
        //hex grid
        const r3 = Math.sqrt(3);
        const r32 = r3 / 2;
        this.ctx.fillStyle = Palette.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = Palette.gridColor;
        this.ctx.lineWidth = 1;
        let cellsX = Math.ceil(this.canvas.width / this.#gridSize / 1.5);
        let cellsY = Math.ceil(this.canvas.height / this.#gridSize / r3);
        this.ctx.beginPath();
        for (let x = -1; x < cellsX; x++){
            let even = x % 2 === 0;
            for (let y = 0; y < cellsY; y++){
                let cx = x * 1.5 * this.#gridSize;
                let cy = y * r3 * this.#gridSize + (even ? 0 : r32 * this.#gridSize);
                this.ctx.moveTo(cx, cy + this.#gridSize * r32);
                this.ctx.lineTo(cx + this.#gridSize * 0.5, cy);
                this.ctx.lineTo(cx + this.#gridSize * 1.5, cy);          
                this.ctx.lineTo(cx + this.#gridSize * 2, cy + this.#gridSize * r32);
            }
        }
        this.ctx.closePath();
        this.ctx.stroke();
    }
    drawGraph(){
        this.graph.draw(this.canvas, this.ctx);
    }
    renderFrame(){
        if (this.rendering){
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawBackground(this.canvas, this.ctx);
            this.drawGraph();
            requestAnimationFrame(() => this.renderFrame());
        }
    }
    startRendering(){
        this.rendering = true;
        this.renderFrame();
    }
    stopRendering(){
        this.rendering = false;
    }

    // graph operations
    addNode(node){
        this.graph.addNode(this.currentId, node);
        return this.currentId++;
    }
    addArc(idFrom, idTo){
        let arc = new ArcData({idFrom, idTo});
        this.graph.addArc(arc);
        return arc;
    }
}