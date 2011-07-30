var RFBCanvas = function(canvas) {
    this._canvas = canvas;
    this._context = canvas.getContext('2d');

    $(this._canvas).css({border: '1px solid red'});
};

RFBCanvas.prototype.resize = function(w, h) {
    this._canvas.style.width  = w;
    this._canvas.style.height = h;
};

RFBCanvas.prototype.drawRect = function(x, y, w, h, rgba_data) {
    var canvas_data = this._context.createImageData(w, h);

    for (var x = 0; x < w; x++) {
        for (var y = 0; y < w; y++) {
            var idx = (x + y * w) * 4;
            var r = rgba_data[idx + 0];
            var g = rgba_data[idx + 1];
            var b = rgba_data[idx + 2];
            var a = rgba_data[idx + 2];

            canvas_data.data[idx + 0] = r;
            canvas_data.data[idx + 1] = g;
            canvas_data.data[idx + 2] = b;
            canvas_data.data[idx + 3] = a;
        }
    }
};
