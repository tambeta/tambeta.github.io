
function Meow(attrs) {
	var _this = this;

	var defaults = {

		// Arguments to pass

		container   : null,    	// jQuery
		gridsize    : [10, 10],
		minemult	: 0.25,		// proportion of cells having mines
		sound		: true,
		ready		: null,		// optional callback

		// Private fields

		_assetp		: null,
		_ctx        : null,
		_cells		: null,
		_inactive	: false,
		_CELL_DIM   : 32,
	};
	attrs = $.extend({}, defaults, attrs);
	$.extend(this, attrs);

	if (!attrs.container || attrs.container.length != 1)
		throw new Error("The `container` attribute is required");
	if (!(attrs.gridsize instanceof Array) || attrs.gridsize.length != 2)
		throw new Error("The `gridsize` attribute must be an array of length 2");

	this._init();
}

// Public methods

Meow.prototype.set_sound = function(sound) {
	this._assetp.set_sound(sound);
}

Meow.prototype.foreach_cell = function(cb) {

	// Convenience routine; the Cell instance is bound to `this`
	// and passed as the first argument to callback. Return false
	// from callback to break.

	var _this = this;
	var x = _this.gridsize[0];
	var y = _this.gridsize[1];

	for (var i=0; i<y; i++) {
		for (var j=0; j<x; j++) {
			var cell = _this._cells[j][i];
			if (cb.apply(cell, [cell]) === false)
				return;
		}
	}
}

Meow.prototype.every_cell = function(cb) {

	// Returns true if predicate cb is true for every cell in the
	// field, false otherwise

	var ret = true;

	this.foreach_cell(function(cell) {
		if (!cb.apply(cell, [cell])) {
			ret = false;
			return false;
		}
	});

	return ret;
}

Meow.prototype.hint = function() {

	// Give a hint by marking a suitable cell. Find "hintable"
	// cells (mined, closed, unmarked cells next to an open cell)
	// or "mined" (but closed and unmarked) cells. Pick a random
	// cell from the former for hinting; if none present, use the
	// latter array. Returns false if hinting failed, true
	// otherwise.

	var hintable = [];
	var mined = [];
	var hcell;

	_g.meow.foreach_cell(function(cell) {
		var nhood;

		if (!cell.is_opened() && !cell.is_marked() && cell.is_mined())
			mined.push(cell);
		if (!cell.is_opened())
			return true;

		nhood = cell.get_neighbors();

		$.each(nhood, function(i, ncell) {
			if (!ncell.is_opened() && !ncell.is_marked() && ncell.is_mined())
				hintable.push(ncell);
		});
	});

	if (!hintable.length) {
		if (!mined.length)
			return false;
		hintable = mined;
	}

	hcell = hintable[_.random(hintable.length - 1)];
	hcell.hint();
	return true;
}

Meow.prototype.debug_openarea = function(n) {

	// Debug routine: open n areas (by opening rank zero cells).

	if (!n) n = 1;

	this.foreach_cell(function(cell) {
		if (cell.get_nmines() == 0 && !cell.is_mined() && !cell.is_opened()) {
			cell.open();
			if (--n <= 0) return false;
		}
	});
}

Meow.prototype.debug_win = function() {

	// Force the game into a winning state

	this.foreach_cell(function(cell) {
		if (cell.is_mined() && cell.is_opened())
			throw new Error("Cannot force game to win: already lost");
		else if (cell.is_mined())
			cell.mark();
		else if (!cell.is_opened())
			cell.open();
	});
}

// Friend methods

Meow.prototype.get_ctx = function() {
	return this._ctx;
}

Meow.prototype.get_cdim = function() {
	return this._CELL_DIM;
}

Meow.prototype.get_cell = function(x, y) {

	// Return a cell or null if no such coordinate

	x = parseInt(x);
	y = parseInt(y);

	if (x < 0 || y < 0 || x >= this.gridsize[0] || y >= this.gridsize[1])
		return null;
	return this._cells[x][y];
}

// Private methods

Meow.prototype._init = function() {
	var _this = this;
	var ready = this.ready;

	_this._assetp = new MeowAssetProvider({
		meow  : _this,
		ready : function() {
			_this._init_canvas();
			_this._init_field(this);
			_this._attach_behavior();

			if (ready && ready instanceof Function)
				ready.apply(_this, []);
		}
	});
	_this._assetp.set_sound(_this.sound);
}

Meow.prototype._init_canvas = function() {
	var _this = this;
	var cont = this.container;
	var x = _this.gridsize[0];
	var y = _this.gridsize[1];
	var w = _this._CELL_DIM * x;
	var h = _this._CELL_DIM * y;
	var ctx;
	var html;

	html =
		"<canvas id=\"_meow_canvas\" width=\"" + w + "\" height=\"" + h + "\">" +
		"<div style=\"color: #eee; padding: 1em;\">" +
		"Your browser doesn't seem to support HTML5 Canvas, required for meowsweeper"
		"</div></canvas>";
	cont.width(w);
	cont.height(h);
	cont.html(html);

	ctx =
		$("#_meow_canvas").get(0).getContext("2d");
	if (!(ctx instanceof CanvasRenderingContext2D))
		throw new Error("Cannot get canvas rendering context");
	_this._ctx = ctx;
}

Meow.prototype._init_field = function(assetp) {
	var _this = this;
	var x = _this.gridsize[0];
	var y = _this.gridsize[1];
	var cells = [];
	var nmines = parseInt(x * y * _this.minemult);

	// Init cells

	for (var i=0; i<x; i++) {
		cells[i] = [];

		for (var j=0; j<y; j++) {
			var cell = new MeowCell({
				meow	: _this,
				x		: i,
				y		: j,
				tp		: assetp,
			});

			cell.render();
			cells[i].push(cell);
		}
	}

	// Init mines

	while (nmines > 0) {
		var minex = parseInt(Math.random() * x);
		var miney = parseInt(Math.random() * y);
		var cell = cells[minex][miney];

		if (!cell.is_mined()) {
			cell.mine();
			nmines--;
		}
	}

	_this._cells = cells;
}

Meow.prototype._attach_behavior = function() {
	var _this = this;
	var canvas = $(this._ctx.canvas);
	var cdim = this._CELL_DIM;

	var tile_coords = function(e) {

		// Helper to return tile coordinates

		return {
			x : parseInt(e.offsetX / cdim),
			y : parseInt(e.offsetY / cdim)
		}
	}

	canvas.click(function(e) {
		var tc = tile_coords(e);
		var cell = _this.get_cell(tc.x, tc.y)
		var ap = _this._assetp;
		var nmines;

		if (_this._inactive || cell.is_marked())
			return;
		nmines = cell.open();

		// Mined, game over, open all cells

		if (nmines && cell.is_mined()) {
			ap.angry_sound();
			_this._inactive = true;
			$.each(_this._cells, function(i, v) {
				$.each(v, function(i, cell) {
					cell.open(); }); });
		}
		else if (nmines && nmines >= 3) {
			ap.calm_sound();
		}

		_this._check_win();
	});

	canvas.contextmenu(function(e) {
		var tc = tile_coords(e);

		if (_this._inactive)
			return;

		_this.get_cell(tc.x, tc.y).mark();
		_this._check_win();
		e.preventDefault();
	});

}

Meow.prototype._check_win = function() {

	// Check win condition; if won, inactivate game and display end
	// of game graphics

	var _this = this;
	var ctx = this._ctx;
	var cdim = this._CELL_DIM;
	var w = cdim * this.gridsize[0];
	var h = cdim * this.gridsize[1];
	var ap = this._assetp;
	var won = false;

	// Check if game has been won

	won = this.every_cell(function(cell) {
		if (cell.is_mined() && !cell.is_marked()) {
			return false;
		}
		else if (!cell.is_mined() && !cell.is_opened()) {
			return false;
		}
		return true;
	});

	if (!won) return false;

	// Game has been won

	this._inactive = true;

	ctx.fillStyle = "rgba(100, 100, 100, 0.65)";
	ctx.fillRect(0, 0, w, h);

	ctx.fillStyle = "#FF9926";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	ap.apply_font(h/2, ctx);
	ctx.fillText("🐱", w/2, h/2);

	ap.apply_font("bold 32px", ctx);
	ctx.fillText("WELL DONE", w/2, h/4*3 + 20);

	return true;
}
