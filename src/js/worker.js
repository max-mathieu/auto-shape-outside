// BUG: marching squares improved to handle knots
// TODO: add console debugging
// TODO: test with multiple shapes

import ComputeShapeOutside from './classes/ComputeShapeOutside';

self.addEventListener('message', (e) => {
  const { imageData, options } = e.data;
  const result = (new ComputeShapeOutside(imageData, options)).run();
  self.postMessage(result);
});
