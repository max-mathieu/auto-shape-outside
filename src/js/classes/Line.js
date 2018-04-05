export default class Line {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.dx = this.x2 - this.x1;
    this.dy = this.y2 - this.y1;
    this.squareLength = (this.dx * this.dx) + (this.dy * this.dy);
    // TODO: find how this thing is actually called
    // since it's used in both the distance function and the intersection function
    this.dot = (this.x2 * this.y1) - (this.x1 * this.y2);
  }

  squareDistanceFrom(x, y) {
    // https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
    const numerator = ((this.dy * x) - (this.dx * y)) + this.dot;
    return (numerator * numerator) / this.squareLength;
  }

  intersectWith(other) {
    // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line
    const xNumerator = (this.dot * other.dx) - (other.dot * this.dx);
    const yNumerator = (this.dot * other.dy) - (other.dot * this.dy);
    const denominator = (this.dx * other.dy) - (other.dx * this.dy);
    const ix = Math.round(xNumerator / denominator);
    const iy = Math.round(yNumerator / denominator);
    return [ix, iy];
  }
}
