import PointList from './PointList';
import Polygon from './Polygon';

export default class ComputeShapeOutside {
  constructor(imageData, options) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.pixelData = imageData.data;
    options = options || {};
    options.useAlpha = options.useAlpha || false;
    options.threshold = options.threshold || 250;
    options.padding = options.padding || 20;
    this.options = options;

    this.wPadding = options.padding + 1;
    this.wWidth = imageData.width + 2 * this.wPadding;
    this.wHeight = imageData.height + 2 * this.wPadding;
  }

  run() {
    const rawMask = this._computeRawMask();
    const paddedMask = this._computePaddedMask(rawMask);
    const rawContour = this._computeRawContour(paddedMask);
    const polygon = this._computePolygon(rawContour);
    self.postMessage({
      options: this.options,
      width: this.width,
      height: this.height,
      pixelData: new ImageData(this.pixelData, this.width, this.height),
      rawMaskData: this._getImageDataFromGrid(rawMask),
      paddedMaskData: this._getImageDataFromGrid(paddedMask),
      rawContour,
      polygon,
      shapeOutsidePolygon: this._getCSS(polygon),
    });
  }

  _getNewGrid() {
    const grid = new Array(this.wWidth);
    for (let x = 0; x < this.wWidth; x++) { grid[x] = new Uint8Array(this.wHeight); }
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
    const useAlpha = this.options.alpha;
    const threshold = this.options.threshold;
    const pixelData = this.pixelData;
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
        const l = 0.2126 * pixelData[p] + 0.7152 * pixelData[p + 1] + 0.0722 * pixelData[p + 2];
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
    const padding = this.options.padding;
    const grid = this._getNewGrid();
    // flag edge points as 2 and maintain a list
    let edges = new PointList();
    const maxX = this.wWidth - 1;
    const maxY = this.wHeight - 1;
    const wPadding = this.wPadding;
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
    for (let i = 0; i < padding; i++) {
      // update edges
      var candidateEdges = new PointList();
      var addCandidateEdge = function (x, y, force) {
        if (!foundEdgesGrid[x][y]) {
          candidateEdges.push(x, y);
          foundEdgesGrid[x][y] = 1;
        }
      };
      edges.forEach((x, y) => {
        addCandidateEdge(x - 1, y);
        addCandidateEdge(x + 1, y);
        addCandidateEdge(x, y - 1);
        addCandidateEdge(x, y + 1);
      });

      edges = new PointList();
      candidateEdges.forEach((x, y) => {
        if (!isInner(grid, x, y)) { edges.push(x, y); }
      });
    }
    // store edges on the grid for next step
    edges.forEach((x, y) => {
      grid[x][y] = 2;
    });
    return grid;
  }

  _computeRawContour(mask) {
    const wPadding = this.wPadding;
    const polygon = new Polygon();
    let curX;
    let curY;
    // find starting point
    let maxX = this.wWidth - 1,
      maxY = this.wHeight - 1;
    const getFirst = () => {
      for (let x = 0; x <= maxX; x++) {
        for (let y = 0; y <= maxY; y++) {
          if (mask[x][y] === 2) return [x, y];
        }
      }
    };
    const first = getFirst();
    curX = first[0];
    curY = first[1];

    const getNext = () => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          let newX = curX + dx,
            newY = curY + dy;
          if (mask[newX][newY] === 2) { return [dx, dy]; }
        }
      }
    };
    let dx = 0;
    let dy = 0;
    while (true) {
      mask[curX][curY] = 3;

      const next = getNext();
      if (!next) break;

      if (dx !== next[0] || dy !== next[1]) {
        polygon.push(curX, curY);
        dx = next[0];
        dy = next[1];
      }
      curX += dx;
      curY += dy;
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
    const wPadding = this.wPadding;

    // a bit like https://en.wikipedia.org/wiki/Sutherland%E2%80%93Hodgman_algorithm
    let clipped = polygon;
    let curWidth = this.wWidth;
    let curHeight = this.wHeight;
    if (clipLeft) {
      clipped = clipped.clip(wPadding, 0, wPadding, curHeight, (x, y) => x >= wPadding).translate(-wPadding, 0);
      curWidth -= wPadding;
    }
    if (clipRight) {
      const maxX = curWidth - 1 - wPadding;
      clipped = clipped.clip(maxX, 0, maxX, curHeight, (x, y) => x <= maxX);
      curWidth -= wPadding;
    }
    if (clipTop) {
      clipped = clipped.clip(0, wPadding, curWidth, wPadding, (x, y) => y >= wPadding).translate(0, -wPadding);
      curHeight -= wPadding;
    }
    if (clipBottom) {
      const maxY = curHeight - 1 - wPadding;
      clipped = clipped.clip(0, maxY, curWidth, maxY, (x, y) => y <= maxY);
      curHeight -= wPadding;
    }

    // scale to %
    const result = [];
    const xScale = 100 / (curWidth - 1);
    const yScale = 100 / (curHeight - 1);
    for (let i = 0; i < clipped.length; i++) {
      const xp = `${(clipped.x[i] * xScale).toFixed(0)}%`;
      const yp = `${(clipped.y[i] * yScale).toFixed(0)}%`;
      result.push(`${xp} ${yp}`);
    }
    return result.join(', ');
  }
}
