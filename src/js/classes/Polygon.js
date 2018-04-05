import PointList from './PointList';
import Line from './Line';

export default class Polygon extends PointList {
  clip(x1, y1, x2, y2, isInFunc) {
    const line = new Line(x1, y1, x2, y2);

    const result = new Polygon();
    const maxI = this.length - 1;
    let lastX = this.x[maxI];
    let lastY = this.y[maxI];
    let lastIsIn = isInFunc(lastX, lastY);
    for (let i = 0; i <= maxI; i++) {
      const x = this.x[i];
      const y = this.y[i];
      const isIn = isInFunc(x, y);
      if (isIn ^ lastIsIn) {
        const intersect = line.intersectWith(new Line(lastX, lastY, x, y));
        result.push(intersect[0], intersect[1]);
      }
      if (isIn) result.push(x, y);
      lastX = x;
      lastY = y;
      lastIsIn = isIn;
    }
    return result;
  }

  simplify(epsilon) {
    const epsilon2 = epsilon * epsilon;
    const polygon = this._douglasPeucker(epsilon2);

    // remove very short lines left by douglasPeucker for some reason
    const result = new Polygon();
    const maxI = polygon.length - 1;
    let curX = polygon.x[maxI];
    let curY = polygon.y[maxI];
    result.push(curX, curY);
    polygon.forEach((x, y) => {
      const line = new Line(curX, curY, x, y);
      if (line.squareLength >= epsilon2) {
        curX = x;
        curY = y;
        result.push(curX, curY);
      }
    });
    return result;
  }

  _douglasPeucker(epsilon2) {
    // https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
    if (this.length <= 3) return this;

    // Find the point with the maximum distance
    const maxI = this.length - 1;
    let maxDistance2 = 0;
    let maxDistanceIndex = 0;
    const line = new Line(this.x[0], this.y[0], this.x[maxI], this.y[maxI]);
    for (let i = 1; i < maxI; i++) {
      const distance2 = line.squareDistanceFrom(this.x[i], this.y[i]);
      if (distance2 > maxDistance2) {
        maxDistance2 = distance2;
        maxDistanceIndex = i;
      }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDistance2 <= epsilon2) {
      const result = new Polygon(2);
      result.push(this.x[0], this.y[0]);
      result.push(this.x[maxI], this.y[maxI]);
      return result;
    }

    const result = new Polygon();
    result.concat(this.slice(0, maxDistanceIndex)._douglasPeucker(epsilon2));
    result.concat(this.slice(maxDistanceIndex, this.length)._douglasPeucker(epsilon2));
    return result;
  }
}
