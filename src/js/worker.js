/* eslint no-restricted-globals: 0 */
import ComputeShapeOutside from './classes/ComputeShapeOutside';

self.addEventListener('message', (e) => {
  const { imageData, options } = e.data;
  const result = (new ComputeShapeOutside(imageData, options)).run();
  self.postMessage(result);
});
