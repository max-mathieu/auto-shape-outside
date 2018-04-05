// TODO: use vue?
// TODO: expose all options
// TODO: make margin a %
const worker = new Worker('./worker.js');

worker.addEventListener('message', (e) => {
  const { position, padding } = e.data.options;
  const { shapeOutsidePolygon } = e.data;
  const baseImageStyleArr = [`float: ${position};`];
  if (position === 'left') {
    baseImageStyleArr.push(`margin-right: ${padding}px;`);
  }
  if (position === 'right') {
    baseImageStyleArr.push(`margin-left: ${padding}px;`);
  }
  baseImageStyleArr.push(`margin-bottom: ${padding}px;`);
  baseImageStyleArr.push(`shape-outside: polygon(${shapeOutsidePolygon});`);
  const baseImageStyle = baseImageStyleArr.join('\r\n');

  const { pixelData } = e.data;
  const { width, height } = pixelData;
  document.getElementById('output').style.display = 'block';

  const result = document.getElementById('result');
  result.value = baseImageStyle;
  setTimeout(() => {
    // autoresize on next tick
    result.style.height = '5px';
    result.style.height = `${result.scrollHeight}px`;
  }, 0);

  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.src = document.forms.frm.elements.url.value;
  img.width = width;
  img.height = height;
  img.style = `max-width: 25%; height: auto;${baseImageStyle}`;
  preview.appendChild(img);
  const span = document.createElement('span');
  span.innerHTML = `
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam quis ante nulla. Etiam imperdiet, sapien non imperdiet hendrerit, ex nisl bibendum sapien, pulvinar blandit massa magna ut ipsum. Praesent a blandit velit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Aenean tempus diam quis risus posuere lacinia. Mauris pellentesque quam sem, ut fermentum dolor sagittis vitae. Aenean elementum mauris at diam eleifend vehicula. Pellentesque non ipsum sagittis, vehicula erat sit amet, ultricies mi. Aliquam luctus vel sem maximus pretium. Ut suscipit consectetur sollicitudin. Maecenas commodo congue massa at vestibulum. Duis non lacinia sapien. Aliquam eu egestas massa. Duis et risus mauris. Vivamus id metus luctus, porttitor metus ac, interdum sapien.
    <br><br>
    Suspendisse tempus ante in mattis porta. Aenean placerat lacus quis volutpat suscipit. Suspendisse posuere justo non justo lacinia, non dignissim eros faucibus. Vestibulum sed convallis risus, et sollicitudin arcu. Donec eleifend ante est, vel tincidunt diam hendrerit vel. Integer nisl turpis, volutpat id viverra in, rhoncus nec dui. Integer eget tincidunt sapien. Cras sodales lacus eros, bibendum efficitur eros facilisis id. Aliquam ornare sem diam, vel commodo urna condimentum eget. Cras congue dapibus mauris, a dapibus felis aliquam id. Maecenas non ultrices urna. Ut sit amet neque consequat lorem rhoncus accumsan ac in arcu.`;
  preview.appendChild(span);

  const debug = document.getElementById('debug');
  debug.innerHTML = '';
  const addCanvas = (imageData, polygon) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    if (polygon) {
      ctx.fillStyle = 'rgba(255,0,0,.3)';
      ctx.strokeStyle = '#f00';
      ctx.beginPath();
      ctx.moveTo(polygon.x[0], polygon.y[0]);
      for (let i = 1; i < polygon.length; i++) { ctx.lineTo(polygon.x[i], polygon.y[i]); }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#00f';
      ctx.beginPath();
      for (let i = 1; i < polygon.length - 1; i += 2) {
        ctx.moveTo(polygon.x[i], polygon.y[i]);
        ctx.lineTo(polygon.x[i + 1], polygon.y[i + 1]);
      }
      ctx.stroke();
    }
    debug.appendChild(canvas);
  };
  addCanvas(pixelData);
  addCanvas(e.data.rawMaskData);
  addCanvas(e.data.paddedMaskData);
  addCanvas(e.data.rawMaskData, e.data.rawContour);
  addCanvas(e.data.rawMaskData, e.data.polygon);
});

const getImageData = (url, options, callback) => {
  const canvas = document.createElement('canvas');
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    let scale = 1;
    if (options.targetWidth) {
      scale = options.targetWidth / img.width;
    } else if (options.targetHeight) {
      scale = options.targetHeight / img.height;
    }
    canvas.width = Math.round(scale * img.width);
    canvas.height = Math.round((canvas.width / img.width) * img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    callback(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };
  img.src = url;
};

const form = document.forms.frm;
form.addEventListener('submit', (e) => {
  const url = form.elements.url.value;
  const imageOptions = {
    targetWidth: parseInt(form.elements.targetWidth.value, 10),
  };
  getImageData(url, imageOptions, (imageData) => {
    const options = {
      position: form.elements.position.value,
      padding: imageData.width * (parseInt(form.elements.padding.value, 10) / 100),
      useAlpha: /\.(png|svg)$/.test(url),
    };
    worker.postMessage({
      imageData,
      options,
    });
  });
  e.preventDefault();
});
