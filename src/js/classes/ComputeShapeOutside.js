// TODO: add debugging flag with stats
// TODO: grid class

import PointList from './PointList';
import Polygon from './Polygon';

export default class ComputeShapeOutside {
  constructor(imageData, options) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.imageData = imageData.data;
    options = options || {};
    options.useAlpha = options.useAlpha || false;
    options.threshold = options.threshold || 250;
    options.padding = options.padding || 20;
    this.options = options;

    this.wPadding = options.padding + 1;
    this.wWidth = this.width + (2 * this.wPadding);
    this.wHeight = this.height + (2 * this.wPadding);
  }

  run() {
    const rawMask = this._computeRawMask();
    const paddedMask = this._computePaddedMask(rawMask);
    const rawContour = this._computeRawContour(paddedMask);
    const polygon = this._computePolygon(rawContour);
    return {
      options: this.options,
      width: this.width,
      height: this.height,
      pixelData: new ImageData(this.imageData, this.width, this.height),
      rawMaskData: this._getImageDataFromGrid(rawMask),
      paddedMaskData: this._getImageDataFromGrid(paddedMask),
      rawContour,
      polygon,
      shapeOutsidePolygon: this._getCSS(polygon),
    };
  }

  _getNewGrid() {
    const grid = new Array(this.wWidth);
    for (let x = 0; x < this.wWidth; x++) {
      grid[x] = new Uint8Array(this.wHeight);
    }
    return grid;
  }

  _getImageDataFromGrid(grid) {
    const imageData = new Uint8ClampedArray(this.wWidth * this.wHeight * 4);
    let i = 0;
    for (let y = 0; y < this.wHeight; y++) {
      for (let x = 0; x < this.wWidth; x++) {
        const r = grid[x][y] === 1 ? 0 : 255;
        const gb = grid[x][y] > 1 ? 0 : r;
        imageData[i++] = r;
        imageData[i++] = gb;
        imageData[i++] = gb;
        imageData[i++] = 255;
      }
    }
    return new ImageData(imageData, this.wWidth, this.wHeight);
  }

  _computeRawMask() {
    // make a 2D grid with values, using the threshold
    const { useAlpha, threshold } = this.options;
    const pixelData = this.imageData;
    const start = this.wPadding;
    const grid = this._getNewGrid();

    let imgX = 0;
    let x = start;
    let y = start;
    for (let p = 0; p < pixelData.length; p += 4) {
      if (useAlpha) {
        grid[x][y] = pixelData[p + 3] < threshold ? 0 : 1;
      } else {
        // compute luminance
        const l = (0.2126 * pixelData[p]) +
                  (0.7152 * pixelData[p + 1]) +
                  (0.0722 * pixelData[p + 2]);
        grid[x][y] = l > threshold ? 0 : 1;
      }
      x++;
      imgX++;
      if (imgX === this.width) {
        imgX = 0;
        x = start;
        y++;
      }
    }
    return grid;
  }

  _computePaddedMask(mask) {
    const { padding } = this.options;
    const grid = this._getNewGrid();
    // flag edge points as 2 and maintain a list
    let edges = new PointList();
    const maxX = this.wWidth - 1;
    const maxY = this.wHeight - 1;

    const isInner = (g, x, y) => g[x - 1][y] && g[x + 1][y] && g[x][y - 1] && g[x][y + 1];
    // copy mask in grid and find initial edges
    const foundEdgesGrid = this._getNewGrid();
    for (let x = 0; x <= maxX; x++) {
      for (let y = 0; y <= maxY; y++) {
        if (!mask[x][y]) {
          grid[x][y] = 0;
        } else {
          grid[x][y] = 1;
          if (!isInner(mask, x, y)) {
            edges.push(x, y);
            foundEdgesGrid[x][y] = 1;
          }
        }
      }
    }

    // TODO: move to grid class
    const notInGrid = (x, y) => !isInner(grid, x, y);
    const isNewEdge = (x, y) => {
      if (!foundEdgesGrid[x][y]) {
        foundEdgesGrid[x][y] = 1;
        return true;
      }
      return false;
    };

    // expand the edges, 1 pixel at a time
    for (let i = 0; i < padding; i++) {
      const candidateEdges = new PointList();

      edges.forEach((x, y) => {
        candidateEdges.pushIf(x - 1, y, isNewEdge);
        candidateEdges.pushIf(x + 1, y, isNewEdge);
        candidateEdges.pushIf(x, y - 1, isNewEdge);
        candidateEdges.pushIf(x, y + 1, isNewEdge);
      });

      edges = candidateEdges.filter(notInGrid);
    }

    // store edges on the grid for next step
    edges.forEach((x, y) => {
      grid[x][y] = 2;
    });
    return grid;
  }

  _computeRawContour(mask) {
    const polygon = new Polygon();
    const maxX = this.wWidth - 1;
    const maxY = this.wHeight - 1;

    // starting from top, find rightmost edges
    for (let y = 0; y <= maxY; y++) {
      let x = maxX;
      while (x >= 0 && mask[x][y] !== 2) {
        x--;
      }
      if (x >= 0) {
        polygon.push(x, y);
      }
    }
    const [firstX, firstY] = polygon.getFirst();
    const [lastX, lastY] = polygon.getLast();
    // starting from bottom, find leftmost edges
    for (let y = lastY; y >= 0; y--) {
      let x = 0;
      while (x <= maxX && mask[x][y] !== 2) {
        x++;
      }
      if (x <= maxX) {
        if ((y === lastY && x === lastX) || (y === firstY && x === firstX)) {
          // no duplicate
        } else {
          polygon.push(x, y);
        }
      }
    }
    return polygon;
  }

  _computePolygon(contour) {
    const epsilon = this.options.padding / 5; // TODO: cap and/or param
    return contour.simplify(epsilon);
  }

  _getCSS(polygon) {
    switch (this.options.position) {
      case 'left':
        return this._clipAndGetCSS(polygon, true, false, true, false);
      case 'right':
        return this._clipAndGetCSS(polygon, false, true, true, false);
      default:
        return this._clipAndGetCSS(polygon, false, false, true, true);
    }
  }

  _clipAndGetCSS(polygon, clipLeft, clipRight, clipTop, clipBottom) {
    const { wPadding } = this;

    // a bit like https://en.wikipedia.org/wiki/Sutherland%E2%80%93Hodgman_algorithm
    let clipped = polygon;
    let curWidth = this.wWidth;
    let curHeight = this.wHeight;
    if (clipLeft) {
      clipped = clipped
        .clip(wPadding, 0, wPadding, curHeight, x => (x >= wPadding))
        .translate(-wPadding, 0);
      curWidth -= wPadding;
    }
    if (clipRight) {
      const maxX = curWidth - 1 - wPadding;
      clipped = clipped
        .clip(maxX, 0, maxX, curHeight, x => (x <= maxX));
      curWidth -= wPadding;
    }
    if (clipTop) {
      clipped = clipped
        .clip(0, wPadding, curWidth, wPadding, (x, y) => (y >= wPadding))
        .translate(0, -wPadding);
      curHeight -= wPadding;
    }
    if (clipBottom) {
      const maxY = curHeight - 1 - wPadding;
      clipped = clipped
        .clip(0, maxY, curWidth, maxY, (x, y) => (y <= maxY));
      curHeight -= wPadding;
    }

    // scale to %
    const result = [];
    const xScale = 100 / (curWidth - 1);
    const yScale = 100 / (curHeight - 1);
    for (let i = 0; i < clipped.length; i++) {
      const [x, y] = clipped.getAt(i);
      const xp = `${(x * xScale).toFixed(0)}%`;
      const yp = `${(y * yScale).toFixed(0)}%`;
      result.push(`${xp} ${yp}`);
    }
    return result.join(', ');
  }
}
