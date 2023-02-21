
// The MeowAssetProvider class handles asset preloading, drawing
// operations, returns raw tiles to MeowCell instances and provides an
// interface to play sounds.

function MeowAssetProvider(attrs) {
	var _this = this;
	var defaults = {

		// Arguments to pass

		meow		: null,
		ready		: null, // ready callback: assets have been loaded
		sound		: true,

		// Private fields

		_bezel_w	: null,
		_images		: {
			paw		: "img/cat-paw-64.png",
			pawhint	: "img/cat-paw-yellow-64.png",
			face	: "img/cat-face-64.png",
		},
		_sounds 	: {
			meow	: "snd/meow.ogg",
			tomcat	: "snd/tomcat.ogg",
		}
	};
	attrs = $.extend({}, defaults, attrs);
	$.extend(this, attrs);

	if (!attrs.meow)
		throw new Error("The `meow` attribute is required");
	this._bezel_w =
		parseInt(this.meow.get_cdim() / 9);
	this._preload_assets();
}

// Private methods

MeowAssetProvider.prototype._preload_assets = function() {
	var _this = this;
	var asset_types =
		["images", "sounds"];
	var n = 0;

	// Count number of assets, later decrease by one to detect
	// when every asset has been loaded.

	$.each(asset_types, function(i, v) {
		n += _.keys(_this["_" + v]).length; });

	// Loop over asset indexes, call the specific preloader for
	// every asset.

	$.each(asset_types, function(i, atype) {
		var alist = _this["_" + atype];
		var loader = _this["_preloader_" + atype];

		$.each(alist, function(id, src) {
			var r = loader.apply(_this, [id, src, function() {

				// If assets seem to be loaded, call the load callback

				if (--n == 0 && _this.ready instanceof Function)
					_this.ready.apply(_this, []);
				else if (n < 0)
					throw new Error("Loaded more assets than expected");
			}]);

			if (r) alist[id] = r;
		});
	});
}

MeowAssetProvider.prototype._preloader_sounds = function(id, src, loaded_cb) {

	// Sounds preloader. id and src are the ID and relative URL of
	// the asset, respectively. The loaded_cb callback must be
	// called once per loaded asset. Anything returned from the
	// preloader will be substituted for the source URL in the
	// asset index.

	var _this = this;

	// Run the SoundJS init code once

	if (!_this._sound_preload_init) {
		createjs.Sound.alternateExtensions = ["mp3"];
		createjs.Sound.removeAllEventListeners("fileload");
		createjs.Sound.removeAllSounds();
		createjs.Sound.on("fileload", function(e) {
			loaded_cb.apply(_this, []);
		}, _this);

		_this._sound_preload_init = true;
	};

	// Register a sound in SoundJS

	createjs.Sound.registerSound(src, id);
}

MeowAssetProvider.prototype._preloader_images = function(id, src, loaded_cb) {

	// Images preloader. See _preloader_sounds for details.

	var _this = this;
	var img = new Image();

	img.addEventListener("load", function() {
		loaded_cb.apply(_this, []); });
	img.src = src;
	return img;
}

MeowAssetProvider.prototype._get_ctx = _.memoize(function() {

	// Return the canvas for tileops

	var id = "_meow_tileprovider";
	var cdim = this.meow.cdim;
	var ctx;

	$("body").append(
		"<canvas id=\"" + id + "\" width=\"" + cdim + "\" height=\"" + cdim + "\" " +
		"style=\"display:none;\">" +
		"</canvas>"
	);
	return $("#" + id).get(0).getContext("2d");
});

MeowAssetProvider.prototype._apply_image = function(imgid, padding) {

	// Apply an image from the preloaded image list to the center of the
	// temporary drawing context. Image is scaled as to leave the requested
	// padding. A custom scaling routine is used, as built-in downsampling is
	// low quality. The latter does not have alpha support; uniform background
	// is assumed and the color of the upper left pixel of the destination area
	// is used for the background of the scaling canvas. An error is thrown if
	// an image hasn't loaded; use the ready callback to detect asset loading.

	var cdim = this.meow.get_cdim();
	var ctx = this._get_ctx();
	var img = this._images[imgid];
	var iw = img.width;
	var ih = img.height;
	var idim =
		parseInt(cdim - (padding * 2));
	var pixel =
		ctx.getImageData(idim, idim, 1, 1).data;
	var fillcolor =
		"rgb(" + pixel[0] + "," + pixel[1] + "," + pixel[2] + ")";
	var scale = idim / iw;
	var scaled;

	if (!img.complete)
		throw new Error("Image \"" + img.src + "\" has not been loaded");
	ctx.drawImage(
		MeowAssetProvider._downscale_image(img, scale, fillcolor),
		padding, padding
	);
}

MeowAssetProvider.prototype._play_sound = function(id) {

	// Wrapper for playing a sound by ID.

	if (!this.sound)
		return;
	createjs.Sound.play(id);
};

// Public methods

MeowAssetProvider.prototype.closed_cell = _.memoize(function() {
	var cdim = this.meow.get_cdim();
	var ctx = this._get_ctx();
	var bezel_w = this._bezel_w;
	var bezel_light = "#ddd"
	var bezel_dark = "#8a8a8a"

	// Cell base

	ctx.fillStyle = "#adadad";
	ctx.fillRect(0, 0, cdim, cdim);

	// Light bezel

	ctx.strokeStyle = bezel_light;
	ctx.beginPath();

	for (var i=0; i<bezel_w; i++) {

		// Horizontal light

		ctx.moveTo(0, i+0.5);
		ctx.lineTo(cdim, i+0.5);

		// Vertical light

		ctx.moveTo(i+0.5, 0);
		ctx.lineTo(i+0.5, cdim);
	}
	ctx.stroke();

	// Dark bezel

	ctx.strokeStyle = bezel_dark;
	ctx.beginPath();

	for (var i=0; i<bezel_w; i++) {

		// Horizontal dark

		ctx.moveTo(i, cdim-0.5-i);
		ctx.lineTo(cdim, cdim-0.5-i);

		// Vertical dark

		ctx.moveTo(cdim-0.5-i, i);
		ctx.lineTo(cdim-0.5-i, cdim);
	}
	ctx.stroke();

	return ctx.getImageData(0, 0, cdim, cdim);
});

MeowAssetProvider.prototype.open_cell = _.memoize(function(nmines) {

	// nmines is the amount of neighboring mines

	var cdim = this.meow.get_cdim();
	var ctx = this._get_ctx();
	var fsize = cdim - 4;
	var colors = [
		"hsl(230, 100%, 30%)",
		"hsl(120, 100%, 30%)",
		"hsl(350, 100%, 30%)",
		"hsl(175, 100%, 30%)",
		"hsl(300, 100%, 30%)",
		"hsl(100, 75%,  50%)",
		"hsl(30,  75%,  50%)",
		"hsl(360, 75%,  50%)",
	];

	if (fsize < 6)
		fsize = 6;

	ctx.fillStyle = "#d4d4d4";
	ctx.fillRect(0, 0, cdim, cdim);
	ctx.fillStyle = "#ddd";
	ctx.fillRect(1, 1, cdim-2, cdim-2);

	if (nmines > 0) {
		this.apply_font(fsize);
		ctx.fillStyle = colors[nmines - 1] || "black";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(String(nmines), cdim/2, cdim/2 + (fsize / 12));
	}

	return ctx.getImageData(0, 0, cdim, cdim);
});

MeowAssetProvider.prototype.marked_cell = _.memoize(function(iid) {
	var cdim = this.meow.get_cdim();
	var ctx = this._get_ctx();

	if (!iid) iid = "paw";

	ctx.putImageData(this.closed_cell(), 0, 0)
	this._apply_image(iid, this._bezel_w * 1.8);
	return ctx.getImageData(0, 0, cdim, cdim);
});

MeowAssetProvider.prototype.hinted_cell = function() {
	return this.marked_cell("pawhint");
}

MeowAssetProvider.prototype.mined_cell = _.memoize(function() {
	var cdim = this.meow.get_cdim();
	var ctx = this._get_ctx();

	ctx.putImageData(this.open_cell(), 0, 0)
	this._apply_image("face", cdim / 10);
	return ctx.getImageData(0, 0, cdim, cdim);
});

MeowAssetProvider.prototype.debug_cell = _.memoize(function(color) {
	var cdim = this.meow.get_cdim();
	var ctx = this._get_ctx();

	ctx.fillStyle = color || "#a00";
	ctx.fillRect(0, 0, cdim, cdim);
	return ctx.getImageData(0, 0, cdim, cdim);
});

MeowAssetProvider.prototype.calm_sound = function() {
	this._play_sound("meow");
}

MeowAssetProvider.prototype.angry_sound = function() {
	this._play_sound("tomcat");
}

MeowAssetProvider.prototype.set_sound = function(sound) {

	// Toggle audio on / off

	this.sound = sound;
}

MeowAssetProvider.prototype.apply_font = function(fspec, ctx) {

	// Apply standard font of to context ctx or instance's working
	// context. If fspec is a positive number, it's treated as the
	// pixel size. Otherwise, it's a string to be prepended to the
	// font family specification.

	if (!ctx)
		ctx = this._get_ctx();
	if (String(fspec).match(/^\d+(\.\d+)?$/))
		fspec += "px";

	ctx.font = fspec + " \"Lucida Grande\", Cantarell, Arial, sans-serif";
}

MeowAssetProvider._downscale_image = function(img, scale, fillcolor) {

	// Frontend for _downscale_canvas, accepting an
	// HTMLImageElement.

	var cnv = document.createElement('canvas');
	var ctx = cnv.getContext('2d');

	cnv.width = img.width;
	cnv.height = img.height;
	ctx.fillStyle = fillcolor || "black";
	ctx.fillRect(0, 0, cnv.width, cnv.height);
	ctx.drawImage(img, 0, 0);

	return MeowAssetProvider._downscale_canvas(cnv, scale);
}

MeowAssetProvider._downscale_canvas = function(cnv, scale) {

	// High-quality image downscaling routine. Scales a canvas by a
	// factor of `scale` < 1.
	//
	// From http://stackoverflow.com/a/19144434

	if (!(scale < 1) || !(scale > 0))
		throw new Error('scale must be a positive number < 1');

	// weight is weight of current source point within target.
	// next weight is weight of current source point within next target's point.

	var sqScale = scale * scale; // square scale = area of source pixel within target
	var sw = cnv.width; // source image width
	var sh = cnv.height; // source image height
	var tw = Math.floor(sw * scale); // target image width
	var th = Math.floor(sh * scale); // target image height
	var sx = 0, sy = 0, sIndex = 0; // source x,y, index within source array
	var tx = 0, ty = 0, yIndex = 0, tIndex = 0; // target x,y, x,y index within target array
	var tX = 0, tY = 0; // rounded tx, ty
	var w = 0, nw = 0, wx = 0, nwx = 0, wy = 0, nwy = 0; // weight / next weight x / y
	var crossX = false; // does scaled px cross its current px right border ?
	var crossY = false; // does scaled px cross its current px bottom border ?
	var sBuffer =
		cnv.getContext('2d').getImageData(0, 0, sw, sh).data;
	var tBuffer = new Float32Array(3 * tw * th); // target buffer Float32 rgb
	var sR = 0, sG = 0,  sB = 0; // source's current point r,g,b

	for (sy = 0; sy < sh; sy++) {
		ty = sy * scale; // y src position within target
		tY = 0 | ty;     // rounded : target pixel's y
		yIndex = 3 * tY * tw;  // line index within target array
		crossY = (tY != (0 | ty + scale));

		if (crossY) { // if pixel is crossing botton target pixel
			wy = (tY + 1 - ty); // weight of point within target pixel
			nwy = (ty + scale - tY - 1); // ... within y+1 target pixel
		}

		for (sx = 0; sx < sw; sx++, sIndex += 4) {
			tx = sx * scale; // x src position within target
			tX = 0 |  tx;    // rounded : target pixel's x
			tIndex = yIndex + tX * 3; // target pixel index within target array
			crossX = (tX != (0 | tx + scale));

			if (crossX) { // if pixel is crossing target pixel's right
				wx = (tX + 1 - tx); // weight of point within target pixel
				nwx = (tx + scale - tX - 1); // ... within x+1 target pixel
			}

			sR = sBuffer[sIndex    ];   // retrieving r,g,b for curr src px.
			sG = sBuffer[sIndex + 1];
			sB = sBuffer[sIndex + 2];

			if (!crossX && !crossY) { // pixel does not cross

				// just add components weighted by squared scale.

				tBuffer[tIndex    ] += sR * sqScale;
				tBuffer[tIndex + 1] += sG * sqScale;
				tBuffer[tIndex + 2] += sB * sqScale;
			}
			else if (crossX && !crossY) { // cross on X only
				w = wx * scale;

				// add weighted component for current px

				tBuffer[tIndex    ] += sR * w;
				tBuffer[tIndex + 1] += sG * w;
				tBuffer[tIndex + 2] += sB * w;

				// add weighted component for next (tX+1) px

				nw = nwx * scale
				tBuffer[tIndex + 3] += sR * nw;
				tBuffer[tIndex + 4] += sG * nw;
				tBuffer[tIndex + 5] += sB * nw;
			}
			else if (crossY && !crossX) { // cross on Y only
				w = wy * scale;

				// add weighted component for current px

				tBuffer[tIndex    ] += sR * w;
				tBuffer[tIndex + 1] += sG * w;
				tBuffer[tIndex + 2] += sB * w;

				// add weighted component for next (tY+1) px

				nw = nwy * scale
				tBuffer[tIndex + 3 * tw    ] += sR * nw;
				tBuffer[tIndex + 3 * tw + 1] += sG * nw;
				tBuffer[tIndex + 3 * tw + 2] += sB * nw;
			}
			else {

				// crosses both x and y : four target points involved
				// add weighted component for current px

				w = wx * wy;
				tBuffer[tIndex    ] += sR * w;
				tBuffer[tIndex + 1] += sG * w;
				tBuffer[tIndex + 2] += sB * w;

				// for tX + 1; tY px

				nw = nwx * wy;
				tBuffer[tIndex + 3] += sR * nw;
				tBuffer[tIndex + 4] += sG * nw;
				tBuffer[tIndex + 5] += sB * nw;

				// for tX ; tY + 1 px

				nw = wx * nwy;
				tBuffer[tIndex + 3 * tw    ] += sR * nw;
				tBuffer[tIndex + 3 * tw + 1] += sG * nw;
				tBuffer[tIndex + 3 * tw + 2] += sB * nw;

				// for tX + 1 ; tY +1 px

				nw = nwx * nwy;
				tBuffer[tIndex + 3 * tw + 3] += sR * nw;
				tBuffer[tIndex + 3 * tw + 4] += sG * nw;
				tBuffer[tIndex + 3 * tw + 5] += sB * nw;
			}
		}
	}

	// Create result canvas

	var resCV = document.createElement('canvas');
	var resCtx = resCV.getContext('2d');
	var imgRes = resCtx.getImageData(0, 0, tw, th);
	var tByteBuffer = imgRes.data;
	var pxIndex = 0;

	resCV.width = tw;
	resCV.height = th;

	// Convert float32 array into a UInt8Clamped Array

	for (sIndex = 0, tIndex = 0; pxIndex < tw * th; sIndex += 3, tIndex += 4, pxIndex++) {
		tByteBuffer[tIndex] = Math.ceil(tBuffer[sIndex]);
		tByteBuffer[tIndex + 1] = Math.ceil(tBuffer[sIndex + 1]);
		tByteBuffer[tIndex + 2] = Math.ceil(tBuffer[sIndex + 2]);
		tByteBuffer[tIndex + 3] = 255;
	}

	// Write result to canvas.

	resCtx.putImageData(imgRes, 0, 0);
	return resCV;
}
