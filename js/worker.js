// TODO: create Polygon class, include and rewrite douglasPeucker function
// TODO: cut only after polygon is done
// BUG: marching squares improved to handle knots
// TODO: improve variable names

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
  this.options = options;
  
  this.wPadding = options.padding + 1;
  this.wWidth = imageData.width + 2 * this.wPadding;
  this.wHeight = imageData.height + 2 * this.wPadding;
}

ComputeShapeOutside.prototype.run = function() {
  var rawMask = this.computeRawMask();
  var paddedMask = this.computePaddedMask(rawMask);
  var contour = this.computeContour(paddedMask);
  var simplifiedContour = this.simplifyContour(contour);
  self.postMessage({
    options: this.options,
    width: this.width,
    height: this.height,
    pixelData: new ImageData(this.pixelData, this.width, this.height),
    rawMaskData: this.getImageDataFromGrid(rawMask),
    paddedMaskData: this.getImageDataFromGrid(paddedMask),
    contour: contour,
    simplifiedContour: simplifiedContour,
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
    if(x < wPadding)
      x = wPadding;
    else if(x > maxX)
      x = maxX;
    if(y < wPadding)
      y = wPadding;
    else if(y > maxY)
      y = maxY;
    grid[x][y] = 2;
  });
  return grid;
};

ComputeShapeOutside.prototype.computeContour = function(mask) {
  var wPadding = this.wPadding;
  var polygon = new PointList();
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
      polygon.push(curX - wPadding, curY - wPadding);
      dx = next[0];
      dy = next[1];
    }
    curX += dx;
    curY += dy;
  }
  return polygon;
};

ComputeShapeOutside.prototype.simplifyContour = function(contour) {
  var epsilon = this.options.padding / 5; // TODO: param
  var epsilon2 = epsilon * epsilon;
  var polygon = douglasPeucker(contour);
  // remove very short lines left by douglasPeucker
  var result = new PointList(2);
  result.push(polygon.x[0], polygon.y[0]);
  for(var i = 1; i < polygon.length; i++) {
    if(squareDistance(polygon.x[i], polygon.y[i], polygon.x[i - 1], polygon.y[i - 1]) >= epsilon2)
      result.push(polygon.x[i], polygon.y[i]);
  }
  return result;
  
  // https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
  function douglasPeucker(polygon) {
    if(polygon.length <= 3)
      return polygon;
    
    // Find the point with the maximum distance
    var maxI = polygon.length - 1, maxDistance2 = 0, maxDistanceIndex = 0;
    for(var i = 1; i < maxI; i++) {
      var distance2 = squareDistanceToLine(polygon.x[i], polygon.y[i], polygon.x[0], polygon.y[0], polygon.x[maxI], polygon.y[maxI]);
      if(distance2 > maxDistance2) {
        maxDistance2 = distance2;
        maxDistanceIndex = i;
      }
    }
    
    // If max distance is greater than epsilon, recursively simplify
    if(maxDistance2 <= epsilon2) {
      var result = new PointList(2);
      result.push(polygon.x[0], polygon.y[0]);
      result.push(polygon.x[maxI], polygon.y[maxI]);
      return result;
    }
      
    // Recursive call
    var slice1 = new PointList();
    for(var i = 0; i < maxDistanceIndex; i++)
      slice1.push(polygon.x[i], polygon.y[i]);
    var polygon1 = douglasPeucker(slice1);
    
    var slice2 = new PointList();
    for(var i = maxDistanceIndex; i <= maxI; i++)
      slice2.push(polygon.x[i], polygon.y[i]);
    var polygon2 = douglasPeucker(slice2);

    var result = new PointList();
    for(var i = 0; i < polygon1.length; i++)
      result.push(polygon1.x[i], polygon1.y[i]);
    for(var i = 0; i < polygon2.length; i++)
      result.push(polygon2.x[i], polygon2.y[i]);
    return result;
  }
  
  function squareDistanceToLine(x, y, x1, y1, x2, y2) {
    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
    var dx = x2 - x1, dy = y2 - y1;
    var numerator = dy * x - dx * y + x2 * y1 - x1 * y2;
    var denominator = dx * dx + dy * dy;
    return numerator * numerator / denominator;
  }
  
  function squareDistance(x1, y1, x2, y2) {
    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
    var dx = x2 - x1, dy = y2 - y1;
    return dx * dx + dy * dy;
  }
};

function Mask() {
  // TODO, migrate all grid stuff in there?
}

function PointList() {
  this.length = 0;
  this.x = new Uint16Array(64);
  this.y = new Uint16Array(64);
}

PointList.prototype.push = function(x, y) {
  var length = this.length;
  if(this.x.length === length) {
    // extend
    var newX = new Uint16Array(length * 2);
    var newY = new Uint16Array(length * 2);
    newX.set(this.x, 0);
    newY.set(this.y, 0);
    this.x = newX;
    this.y = newY;
  }
  this.x[length] = x;
  this.y[length] = y;
  this.length++;
};

PointList.prototype.forEach = function(callback) {
  for(var i = 0; i < this.length; i++) {
    var stop = callback(this.x[i], this.y[i], i);
    if(stop)
      break;
  }
};
