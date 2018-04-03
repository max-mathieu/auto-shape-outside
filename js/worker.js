// BUG: marching squares improved to handle knots
// TODO: cut after polygon is done
// TODO: add console debugging

// TODO: test with concave shapes
// TODO: test with multiple shapes
self.addEventListener('message', function(e) {
  var imageData = e.data.imageData;
  var options = e.data.options;
  return (new ComputeShapeOutside(imageData, options)).run();
});

function ComputeShapeOutside(imageData, options) {
  this.width = imageData.width;
  this.height = imageData.height;
  this.pixelData = imageData.data;
  options = options || {};
  options.useAlpha = options.useAlpha || false;
  options.threshold = options.threshold || 250;
  options.padding = options.padding || 20;
  options.clipLeft = options.clipLeft ? options.clipLeft : true;
  options.clipRight = options.clipRight ? options.clipRight : true;
  options.clipTop = options.clipTop ? options.clipTop : true;
  options.clipBottom = options.clipBottom ? options.clipBottom : true;
  this.options = options;
  
  this.wPadding = options.padding + 1;
  this.wWidth = imageData.width + 2 * this.wPadding;
  this.wHeight = imageData.height + 2 * this.wPadding;
}

ComputeShapeOutside.prototype.run = function() {
  var rawMask = this.computeRawMask();
  var paddedMask = this.computePaddedMask(rawMask);
  var rawContour = this.computeRawContour(paddedMask);
  var polygon = this.computePolygon(contour);
  self.postMessage({
    options: this.options,
    width: this.width,
    height: this.height,
    pixelData: new ImageData(this.pixelData, this.width, this.height),
    rawMaskData: this.getImageDataFromGrid(rawMask),
    paddedMaskData: this.getImageDataFromGrid(paddedMask),
    polygon: polygon,
  });
};

ComputeShapeOutside.prototype.getNewGrid = function() {
  var grid = new Array(this.wWidth);
  for(var x = 0; x < this.wWidth; x++)
    grid[x] = new Uint8Array(this.wHeight);
  return grid;
};

ComputeShapeOutside.prototype.getImageDataFromGrid = function(grid) {
  var imageData = new Uint8ClampedArray(this.wWidth * this.wHeight * 4);
  var i = 0;
  for(var y = 0; y < this.wHeight; y++) {
    for(var x = 0; x < this.wWidth; x++) {
      var r = grid[x][y] > 0 ? 255 : 0;
      var gb = grid[x][y] === 1 ? r : 0;
      imageData[i++] = r;
      imageData[i++] = gb;
      imageData[i++] = gb;
      imageData[i++] = 255;
    }
  }
  return new ImageData(imageData, this.wWidth, this.wHeight);
};
  
ComputeShapeOutside.prototype.computeRawMask = function() {
  // make a 2D grid with values, using the threshold
  var useAlpha = this.options.alpha, threshold = this.options.threshold;
  var pixelData = this.pixelData;
  var start = this.wPadding;
  var grid = this.getNewGrid();
  var imgX = 0, x = start, y = start;
  for(var p = 0; p < pixelData.length; p += 4) {
    if(useAlpha) {
      grid[x][y] = pixelData[p+3] < threshold ? 0 : 1;
    } else {
      // compute luminance
      var l = .2126 * pixelData[p] + .7152 * pixelData[p+1] + .0722 * pixelData[p+2];
      grid[x][y] = l > threshold ? 0 : 1;
    }
    x++;
    imgX++;
    if(imgX === this.width) {
      imgX = 0;
      x = start;
      y++;
    }
  }
  return grid;
};

ComputeShapeOutside.prototype.computePaddedMask = function(mask) {
  var padding = this.options.padding;
  var grid = this.getNewGrid();
  // flag edge points as 2 and maintain a list
  var edges = new PointList();
  var maxX = this.wWidth - 1, maxY = this.wHeight - 1, wPadding = this.wPadding;
  var isInner = function(g, x, y) {
    return g[x-1][y] && g[x+1][y] && g[x][y-1] && g[x][y+1];
  };
  var foundEdgesGrid = this.getNewGrid();
  for(var x = 0; x <= maxX; x++) {
    for(var y = 0; y <= maxY; y++) {
      if(!mask[x][y])
        grid[x][y] = 0;
      else {
        grid[x][y] = 1;
        if(!isInner(mask, x, y)) {
          edges.push(x, y);
          foundEdgesGrid[x][y] = 1;
        }
      }
    }
  }
  for(var i = 0; i < padding; i++) {
    // update edges
    var candidateEdges = new PointList();
    var addCandidateEdge = function(x, y, force) {
      if(!foundEdgesGrid[x][y]) {
        candidateEdges.push(x, y);
        foundEdgesGrid[x][y] = 1;
      }
    };
    edges.forEach(function(x, y) {
      addCandidateEdge(x - 1, y);
      addCandidateEdge(x + 1, y);
      addCandidateEdge(x, y - 1);
      addCandidateEdge(x, y + 1);
    });
    
    edges = new PointList();
    candidateEdges.forEach(function(x, y) {
      if(!isInner(grid, x, y))
        edges.push(x, y);
    });
  }
  // store edges on the grid, and cut at original image
  maxX -= wPadding;
  maxY -= wPadding;
  edges.forEach(function(x, y) {
    grid[x][y] = 2;
  });
  return grid;
};

ComputeShapeOutside.prototype.computeRawContour = function(mask) {
  var wPadding = this.wPadding;
  var polygon = new Polygon();
  var curX, curY;
  // find starting point
  var maxX = this.wWidth - 1, maxY = this.wHeight - 1;
  var getFirst = function() {
    for(var x = 0; x <= maxX; x++) {
      for(var y = 0; y <= maxY; y++) {
        if(mask[x][y] === 2)
          return [x, y];
      }
    }
  };
  var first = getFirst();
  curX = first[0];
  curY = first[1];
  
  var getNext = function() {
    for(var dy = -1; dy <= 1; dy++) {
      for(var dx = -1; dx <= 1; dx++) {
        var newX = curX + dx, newY = curY + dy;
        if(mask[newX][newY] === 2)
          return [dx, dy];
      }
    }
  };
  var dx = 0, dy = 0;
  while(true) {
    mask[curX][curY] = 3;
    
    var next = getNext();
    if(!next)
      break;
    
    if(dx !== next[0] || dy !== next[1]) {
      polygon.push(curX, curY);
      dx = next[0];
      dy = next[1];
    }
    curX += dx;
    curY += dy;
  }
  return polygon;
};

ComputeShapeOutside.prototype.computePolygon = function(contour) {
  var epsilon = this.options.padding / 5; // TODO: param
  var simplified = contour.simplify(epsilon);
  
  if(this.options.clipLeft || this.options.clipRight || this.options.clipTop || this.options.clipBottom) {
    var minX = this.options.clipLeft ? this.wPadding : 0;
    var maxX = this.wWidth - 1 - (this.options.clipRight? this.wPadding : 0);
    var minY = this.options.clipTop ? this.wPadding : 0;
    var maxY = this.wHeight - 1 - (this.options.clipBottom ? this.wPadding : 0);
    return simplified.clip(minX, maxX, minY, maxY);
  } else
    return simplified;
};

function Mask() {
  // TODO, migrate all grid stuff in there?
}

function PointList(length) {
  this.length = 0;
  this.x = new Uint16Array(length || 64);
  this.y = new Uint16Array(length || 64);
}

PointList.prototype._extend = function(newLength) {
  var newX = new Uint16Array(newLength);
  var newY = new Uint16Array(newLength);
  newX.set(this.x, 0);
  newY.set(this.y, 0);
  this.x = newX;
  this.y = newY;
}

PointList.prototype.push = function(x, y) {
  var length = this.length;
  if(this.x.length === length)
    this._extend(length < 65536 ? length * 2 : 65536);
  this.x[length] = x;
  this.y[length] = y;
  this.length++;
};

PointList.prototype.concat = function(other) {
  var newLength = this.length + other.length;
  if(this.x.length <= newLength)
    this._extend(newLength);
  this.x.set(other.x.slice(0, other.length), this.length);
  this.y.set(other.y.slice(0, other.length), this.length);
  this.length = newLength;
};

PointList.prototype.forEach = function(callback, begin, end) {
  begin = begin || 0;
  end = end || this.length;
  for(var i = begin; i < this.length; i++) {
    var shouldStop = callback(this.x[i], this.y[i], i);
    if(shouldStop)
      return;
  }
};

PointList.prototype.slice = function(begin, end) {
  var length = end - begin;
  var slice = new Polygon(length);
  slice.x.set(this.x.slice(begin, end));
  slice.y.set(this.y.slice(begin, end));
  slice.length = length;
  return slice;
};

function Polygon(length) {
  PointList.call(this, length);
};
Polygon.prototype = PointList.prototype;

Polygon.prototype.clip = function(minX, maxX, minY, maxY) {
  // turns out this has a name
  // https://en.wikipedia.org/wiki/Sutherland%E2%80%93Hodgman_algorithm
  if(minX) {
    
  }
  return this;
};

Polygon.prototype.simplify = function(epsilon) {
  var epsilon2 = epsilon * epsilon;
  var polygon = this._douglasPeucker(epsilon2);
  
  // remove very short lines left by douglasPeucker for some reason
  var result = new Polygon();
  result.push(polygon.x[0], polygon.y[0]);
  for(var i = 1; i < polygon.length; i++) {
    if(squareDistance(polygon.x[i], polygon.y[i], polygon.x[i - 1], polygon.y[i - 1]) >= epsilon2)
      result.push(polygon.x[i], polygon.y[i]);
  }
  return result;
};

Polygon.prototype._douglasPeucker = function(epsilon2) {
  // https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
  if(this.length <= 3)
    return this;
  
  // Find the point with the maximum distance
  var maxI = this.length - 1, maxDistance2 = 0, maxDistanceIndex = 0;
  for(var i = 1; i < maxI; i++) {
    // TODO curry function to take x
    var distance2 = squareDistanceToLine(this.x[i], this.y[i], this.x[0], this.y[0], this.x[maxI], this.y[maxI]);
    if(distance2 > maxDistance2) {
      maxDistance2 = distance2;
      maxDistanceIndex = i;
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if(maxDistance2 <= epsilon2) {
    var result = new Polygon(2);
    result.push(this.x[0], this.y[0]);
    result.push(this.x[maxI], this.y[maxI]);
    return result;
  }
  
  var result = new Polygon();
  result.concat(this.slice(0, maxDistanceIndex)._douglasPeucker(epsilon2));
  result.concat(this.slice(maxDistanceIndex, this.length)._douglasPeucker(epsilon2));
  return result;
};

function squareDistanceToLine(x, y, x1, y1, x2, y2) {
  // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
  var dx = x2 - x1, dy = y2 - y1;
  var numerator = dy * x - dx * y + x2 * y1 - x1 * y2;
  var denominator = dx * dx + dy * dy;
  return numerator * numerator / denominator;
}

function squareDistance(x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
}
