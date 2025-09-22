// Graph, Node, and Arc definitions.

import { Vector2 } from "./vector2.js";
import { Palette } from "./palette.js";

/** Anything that needs a shadow rendered **/
class ShadowObject {
  constructor() {
    this.shadowColor = "black";
    this.shadowBlur = 10;
    this.shadowOffsetX = 5;
    this.shadowOffsetY = 5;
  }
  prepShadow(ctx) {
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetX = this.shadowOffsetX;
    ctx.shadowOffsetY = this.shadowOffsetY;
  }
  clearShadow(ctx) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

/** The data stored for a Node. **/
export class NodeObject extends ShadowObject {
  #textPadding = 10;
  #strokeThickness = 2;
  #font = "20px Arial";
  #displayRadius = 10;
  #clickPadding = 5;

  constructor({ position, strokeColor, fillColor, label, radius } = {}) {
    super();
    this.position = position || new Vector2(0, 0);
    this.strokeColor = strokeColor || Palette.nodeStrokeColor;
    this.textColor = Palette.nodeTextColor;
    this.fillColor = fillColor || Palette.nodeFillColor;
    this.label = label || null;
    this.radius = radius || 10;
    this.fixedRadius = !!radius;
  }

  drawShadow(canvas, ctx, graph) {
    ctx.fillStyle = "black";
    ctx.lineWidth = this.#strokeThickness;
    let radius = this.#calcCircleRadius(ctx);
    ctx.beginPath();
    this.prepShadow(ctx);
    ctx.arc(this.position.x, this.position.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    this.clearShadow(ctx);
  }

  isClicked(pos) {
    return (
      pos.sub(this.position).length <= this.#displayRadius + this.#clickPadding
    );
  }

  #calcCircleRadius(ctx) {
    let textLength = ctx.measureText(this.label).width;
    let radius = this.fixedRadius
      ? this.radius
      : Math.max(this.radius, textLength / 2 + this.#textPadding);
    this.#displayRadius = radius;
    return radius;
  }

  drawShape(canvas, ctx, graph, selected) {
    ctx.fillStyle = this.fillColor;
    ctx.strokeStyle = selected ? Palette.nodeSelectColor : this.strokeColor;
    ctx.lineWidth = this.#strokeThickness;
    let radius = this.#calcCircleRadius(ctx);

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    if (this.label) {
      ctx.font = this.#font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = this.strokeColor;
      ctx.fillText(this.label, this.position.x, this.position.y);
    }
  }

  draw(canvas, ctx, graph, selected = false) {
    this.drawShape(canvas, ctx, graph, selected);
  }
}

/** The data stored for an Arc. **/
export class ArcObject extends ShadowObject {
  #strokeThickness = 2;
  #displayFrom = new Vector2(0, 0);
  #displayTo = new Vector2(0, 1);
  #clickThreshold = 5;

  constructor({ fromId, toId, color, arrowStyle, label }) {
    super();
    this.fromId = fromId;
    this.toId = toId;
    this.color = color || Palette.arcColor;
    this.arrowStyle = arrowStyle; // forward, reverse, cross
    this.label = label;
  }

  isClicked(pos) {
    let from = this.#displayFrom;
    let to = this.#displayTo;
    let d1 = pos.sub(from).length;
    let d2 = pos.sub(to).length;
    let d = from.sub(to).length;
    let sum = d1 + d2;
    return sum <= d + this.#clickThreshold;
  }

  drawArrowhead(canvas, ctx, from, to) {
    let midPoint = from.add(to).mul(0.5);
    let angle = Math.atan2(from.y - to.y, from.x - to.x);
    let arrowSize = 10;
    ctx.save();
    ctx.translate(midPoint.x, midPoint.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-arrowSize * 0.5, 0);
    ctx.lineTo(arrowSize * 0.5, arrowSize);
    ctx.moveTo(arrowSize * 0.5, -arrowSize);
    ctx.lineTo(-arrowSize * 0.5, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  drawLabel(canvas, ctx, from, to) {
    let midPoint = from.add(to).mul(0.5);
    let offset = from
      .sub(to)
      .normalise()
      .rotate(Math.PI / 2)
      .mul(20);
    midPoint.addSelf(offset);
    ctx.save();
    ctx.translate(midPoint.x, midPoint.y);
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.color;
    ctx.fillText(this.label, 0, 0);
    ctx.restore();
  }

  drawCross(canvas, ctx, from, to) {
    let midPoint = from.add(to).mul(0.5);
    let angle = Math.atan2(from.y - to.y, from.x - to.x);
    let crossSize = 10;
    ctx.save();
    ctx.translate(midPoint.x, midPoint.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-crossSize, -crossSize);
    ctx.lineTo(crossSize, crossSize);
    ctx.moveTo(-crossSize, crossSize);
    ctx.lineTo(crossSize, -crossSize);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  drawShadow(canvas, ctx, graph) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    this.prepShadow(ctx);
    this.drawShape(canvas, ctx, graph);
    this.clearShadow(ctx);
  }

  draw(canvas, ctx, graph, selected = false) {
    if (selected) {
      ctx.lineWidth = this.#strokeThickness + 2;
      ctx.strokeStyle = Palette.arcSelectColor;
      ctx.fillStyle = Palette.arcSelectColor;
    } else {
      ctx.lineWidth = this.#strokeThickness;
      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;
    }
    this.drawShape(canvas, ctx, graph);
    if (this.label) {
      this.drawLabel(
        canvas,
        ctx,
        graph.nodeData[this.fromId].position,
        graph.nodeData[this.toId].position,
      );
    }
  }

  drawShape(canvas, ctx, graph) {
    let from = graph.nodeData[this.fromId].position;
    let to = graph.nodeData[this.toId].position;
    let angle = Math.atan2(to.y - from.y, to.x - from.x);
    let offset = new Vector2(
      Math.cos(angle) * graph.nodeData[this.fromId].radius,
      Math.sin(angle) * graph.nodeData[this.fromId].radius,
    );
    let fromOffset = from.add(offset);
    this.#displayFrom = fromOffset;
    let toOffset = to.sub(offset);
    this.#displayTo = toOffset;
    ctx.beginPath();
    ctx.moveTo(fromOffset.x, fromOffset.y);
    ctx.lineTo(toOffset.x, toOffset.y);
    ctx.stroke();
    if (this.arrowStyle) {
      let styles = this.arrowStyle.split("-");
      for (let style of styles) {
        switch (style) {
          case "forward":
            this.drawArrowhead(canvas, ctx, fromOffset, toOffset);
            break;
          case "reverse":
            this.drawArrowhead(canvas, ctx, toOffset, fromOffset);
            break;
          case "cross":
            this.drawCross(canvas, ctx, fromOffset, toOffset);
            break;
        }
      }
    }
  }
}

/**
 * A collection of nodes and arcs.
 * Contains some methods for manipulation.
 **/
export class Graph {
  constructor() {
    this.adjacencyList = {};
    this.nodeData = {};
    this.arcData = [];
  }

  addNode(id, nodeData) {
    if (!this.adjacencyList[id]) {
      this.adjacencyList[id] = [];
    }
    this.nodeData[id] = nodeData;
  }

  addArc(arc) {
    let fromId = arc.fromId;
    let toId = arc.toId;
    if (!this.adjacencyList[fromId]) this.adjacencyList[fromId] = [];
    this.adjacencyList[fromId].push(toId);
    this.arcData.push(arc);
  }

  removeArc(fromId, toId) {
    this.adjacencyList[fromId] = this.adjacencyList[fromId].filter(
      (v) => v !== toId,
    );
    this.adjacencyList[toId] = this.adjacencyList[toId].filter(
      (v) => v !== fromId,
    );
    this.arcData = this.arcData.filter(
      (arc) => arc.fromId !== fromId || arc.toId !== toId,
    );
  }

  removeNode(id) {
    for (let node in this.adjacencyList) {
      this.adjacencyList[node] = this.adjacencyList[node].filter(
        (v) => v !== id,
      );
    }
    this.arcData = this.arcData.filter(
      (arc) => arc.fromId !== id && arc.toId !== id,
    );
    delete this.nodeData[id];
    delete this.adjacencyList[id];
  }

  getNeighbours(id, bidirectional = false) {
    if (bidirectional) {
      let nodes = this.adjacencyList[id];
      for (let key in this.adjacencyList) {
        if (this.adjacencyList[key].includes(id)) {
          nodes.push(key);
        }
      }
      return nodes;
    } else {
      return this.adjacencyList[id];
    }
  }

  drawShadow(canvas, ctx) {
    for (let arc of this.arcData) {
      arc.drawShadow(canvas, ctx, this);
    }
    for (let nodeId in this.nodeData) {
      this.nodeData[nodeId].drawShadow(canvas, ctx, this);
    }
  }

  draw(canvas, ctx, selection) {
    const drawShadow = true;
    if (drawShadow) {
      this.drawShadow(canvas, ctx);
    }
    for (let arc of this.arcData) {
      let selected = selection.arcs.reduce(
        (acc, val) =>
          acc || (val.fromId === arc.fromId && val.toId === arc.toId),
        false,
      );
      arc.draw(canvas, ctx, this, selected);
    }
    for (let nodeId in this.nodeData) {
      this.nodeData[nodeId].draw(
        canvas,
        ctx,
        this,
        selection.nodes.includes(nodeId),
      );
    }
  }

  /** Turns an anonymous object into a graph object */
  static parseObject(obj) {
    let graph = new Graph();
    for (let node in obj.nodes) {
      let newNode = new NodeObject(obj.nodes[node]);
      let position = new Vector2(
        obj.nodes[node].position.x,
        obj.nodes[node].position.y,
      );
      newNode.position = position;
      graph.addNode(node, newNode);
    }
    for (let arc of obj.arcs) {
      let arcData = new ArcObject(arc);
      graph.addArc(arcData);
    }
    return graph;
  }

  asSerialisable() {
    let serialisable = { nodes: {}, arcs: [] };
    for (let node in this.nodeData) {
      serialisable.nodes[node] = this.nodeData[node];
    }
    for (let arc of this.arcData) {
      serialisable.arcs.push(arc);
    }
    return serialisable;
  }
}

