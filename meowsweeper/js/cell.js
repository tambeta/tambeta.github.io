
// MeowCell represents one cell of the playing field and encapsulates its
// behavior. It is also aware of its neighbors, notably for cascaded action
// when a rank zero tile is opened.

function MeowCell(attrs) {
	var _this = this;
	var defaults = {

		// Arguments to pass

		meow	: null,    	// Meow object
		x		: null,
		y		: null,
		tp		: null,

		// Private fields

		_mined	: false,
		_opened	: false,
		_marked	: false,
	};
	attrs = $.extend({}, defaults, attrs);
	$.extend(this, attrs);

	if (!attrs.meow)
		throw new Error("The `meow` attribute is required");
	if (!attrs.tp)
		throw new Error("The `tp` attribute is required");
	if (attrs.x === null || attrs.y === null)
		throw new Error("The `x` and `y` attributes must be defined");
}

MeowCell.prototype.is_marked = function() {
	return this._marked;
}

MeowCell.prototype.is_mined = function() {
	return this._mined;
}

MeowCell.prototype.is_opened = function() {
	return this._opened;
}

MeowCell.prototype.render = function() {
	var tile = this.tp.closed_cell();
	this._draw_tile(tile);
}

MeowCell.prototype.mark = function(hinted) {

	// Toggle cell mark status. Returns new mark status. If
	// `hinted` is true, use the special hint mark; this is a
	// cosmetic difference only.

	var tp = this.tp;

	if (this._opened)
		return false;

	if (this._marked) {
		tile = tp.closed_cell();
		this._marked = false;
	}
	else {
		tile = hinted ?
			tp.hinted_cell() :
			tp.marked_cell() ;
		this._marked = true;
	}

	this._draw_tile(tile);
	return this._marked;
}

MeowCell.prototype.hint = function() {
	this.mark(true);
}

MeowCell.prototype.mine = function() {
	this._mined = true;
}

MeowCell.prototype.open = function() {

	// Open, recursively if number of neighboring mines == 0.
	// Returns number of neighboring mines or -1 if mined square.
	// Returns null if cell was previously opened.

	var tp = this.tp;
	var nhood = this.get_neighbors();
	var nmines = 0;
	var tile;

	if (this.is_opened()) {
		return null;
	}
	else if (this.is_mined()) {
		this._opened = true;
		tile = tp.mined_cell();
		nmines = -1;
	}
	else {
		nmines = this.get_nmines(nhood);
		tile = tp.open_cell(nmines);
		this._opened = true;

		if (nmines == 0) {
			$.each(nhood, function(i, v) {
				if (!v.is_opened())
					v.open()
			});
		}
	}

	this._draw_tile(tile);
	return nmines;
}

MeowCell.prototype.debug = function(color) {
	this._draw_tile(this.tp.debug_cell(color));
}

MeowCell.prototype.get_nmines = function(nhood) {

	// Return the number of neighboring mines, optionally passing
	// the neighborhood

	var nmines = 0;

	if (!nhood)
		nhood = this.get_neighbors();

	$.each(nhood, function(i, v) {
		if (v.is_mined())
			nmines++; });
	return nmines;
}

MeowCell.prototype.get_neighbors = function() {

	// Return an array of all cell's neighbors

	var meow = this.meow;
	var x = this.x;
	var y = this.y;
	var nhood = [];
	var nhood_coords = [
		[-1, -1], [0, -1], [1, -1],
		[-1, 0], [1, 0],
		[-1, 1], [0, 1], [1, 1]
	];

	$.each(nhood_coords, function(i, v) {
		var nx = x + v[0];
		var ny = y + v[1];
		var cell = meow.get_cell(nx, ny);

		if (cell)
			nhood.push(cell);
	});

	return nhood;
}

MeowCell.prototype._draw_tile = function(tile) {
	var cdim = this.meow.get_cdim();
	var ctx = this.meow.get_ctx();

	ctx.putImageData(tile, this.x*cdim, this.y*cdim);
}

