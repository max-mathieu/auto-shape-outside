// TODO: cleanup
// TODO: expose all options
// TODO: preview: only float left/right
// TODO: make margin a % of image/targetWidth
(function() {
  var worker = new Worker('./js/worker.js');
  worker.addEventListener('message', function(e) {
    var width = e.data.pixelData.width;
    var height = e.data.pixelData.height;
    var shapeOutsideStyle = 'shape-outside: polygon(' + e.data.shapeOutsidePolygon + ');';
    
    document.getElementById('output').style.display = 'block';
    
    var result = document.getElementById('result');
    result.innerText = shapeOutsideStyle;
    setTimeout(function() {
      // autoresize on next tick
      result.style.height = '5px';
      result.style.height = result.scrollHeight + 'px';
    }, 0);
    
    var preview = document.getElementById('preview');
    preview.innerHTML = '';
    var img = document.createElement('img');
    img.src = document.forms.frm.elements.url.value;
    img.width = width;
    img.height = height;
    var baseStyle = 'max-width: 25%; height: auto; margin-bottom: ' + e.data.options.padding + 'px; ' + shapeOutsideStyle;
    if(e.data.options.position === 'right')
      img.style = 'float:right; margin-left: ' + e.data.options.padding + 'px; ' + baseStyle;
    if(e.data.options.position === 'left')
      img.style = 'float:left; margin-right: ' + e.data.options.padding + 'px; ' + baseStyle;
    preview.appendChild(img);
    var span = document.createElement('span');
    span.innerHTML = 
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam quis ante nulla. Etiam imperdiet, sapien non imperdiet hendrerit, ex nisl bibendum sapien, pulvinar blandit massa magna ut ipsum. Praesent a blandit velit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Aenean tempus diam quis risus posuere lacinia. Mauris pellentesque quam sem, ut fermentum dolor sagittis vitae. Aenean elementum mauris at diam eleifend vehicula. Pellentesque non ipsum sagittis, vehicula erat sit amet, ultricies mi. Aliquam luctus vel sem maximus pretium. Ut suscipit consectetur sollicitudin. Maecenas commodo congue massa at vestibulum. Duis non lacinia sapien. Aliquam eu egestas massa. Duis et risus mauris. Vivamus id metus luctus, porttitor metus ac, interdum sapien.' +
      '<br><br>' + 
      'Suspendisse tempus ante in mattis porta. Aenean placerat lacus quis volutpat suscipit. Suspendisse posuere justo non justo lacinia, non dignissim eros faucibus. Vestibulum sed convallis risus, et sollicitudin arcu. Donec eleifend ante est, vel tincidunt diam hendrerit vel. Integer nisl turpis, volutpat id viverra in, rhoncus nec dui. Integer eget tincidunt sapien. Cras sodales lacus eros, bibendum efficitur eros facilisis id. Aliquam ornare sem diam, vel commodo urna condimentum eget. Cras congue dapibus mauris, a dapibus felis aliquam id. Maecenas non ultrices urna. Ut sit amet neque consequat lorem rhoncus accumsan ac in arcu.';
    preview.appendChild(span);
    
    var debug = document.getElementById('debug');
    debug.innerHTML = '';
    var addCanvas = function(imageData, polygon) {
      var canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      var ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      if (polygon) {
        ctx.fillStyle = 'rgba(255,0,0,.3)';
        ctx.strokeStyle = '#f00';
        ctx.beginPath();
        ctx.moveTo(polygon.x[0], polygon.y[0]);
        for (var i = 1; i < polygon.length; i++)
          ctx.lineTo(polygon.x[i], polygon.y[i]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.strokeStyle = '#00f';
        ctx.beginPath();
        for (var i = 1; i < polygon.length - 1; i+=2) {
          ctx.moveTo(polygon.x[i], polygon.y[i]);
          ctx.lineTo(polygon.x[i+1], polygon.y[i+1]);
        }
        ctx.stroke();
        
      }
      debug.appendChild(canvas);
    };
    addCanvas(e.data.pixelData);
    addCanvas(e.data.rawMaskData);
    addCanvas(e.data.paddedMaskData);
    addCanvas(e.data.rawMaskData, e.data.rawContour);
    addCanvas(e.data.rawMaskData, e.data.polygon);
  });
  
  var getImageData = function(url, options, callback) {
    var canvas = document.createElement('canvas');
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      var scale = 1;
      if (options.targetWidth)
        scale = options.targetWidth / img.width;
      else if (options.targetHeight)
        scale = options.targetHeight / img.height;
      canvas.width = Math.round(scale * img.width);
      canvas.height = Math.round(canvas.width / img.width * img.height);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.src = url;
  };
  
  var initUI = function() {
    document.forms.frm.addEventListener('submit', function(e) {
      var url = this.elements.url.value;
      var options = {
        padding: parseInt(this.elements.padding.value),
        targetWidth: parseInt(this.elements.targetWidth.value),
        targetHeight: parseInt(this.elements.targetHeight.value),
        position: this.elements.position.value,
      };
      getImageData(url, options, function(imageData) {
        worker.postMessage({
          url: url,
          imageData: imageData,
          options: options,
        });
      });
      e.preventDefault();
    });
  };
  
  initUI();
}());
