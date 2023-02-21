
var _g = {
	meow		: null,
	gridsize	: null,
	minemult	: null,
	sound		: true,
	hints		: 0,
};

$(document).ready(function() {
	_init_menu();
	_attach_behavior();
	$("#menu_newgame").click();
});

function _init_menu() {
	var set_grid_size = function(btnid) {
		if (btnid == "small")
			_g.gridsize = [10, 10];
		else if (btnid == "medium")
			_g.gridsize = [17, 12];
		else if (btnid == "large")
			_g.gridsize = [20, 15];
		else
			_g.gridsize = [25, 20];
	};

	var set_difficulty = function(btnid) {
		if (btnid == "easy")
			_g.minemult = 1 / 6;
		else if (btnid == "medium")
			_g.minemult = 1 / 5;
		else
			_g.minemult = 1 / 4;
	};

	var set_sound = function(btnid) {
		if (btnid == "on")
			_g.sound = true;
		else
			_g.sound = false;

		if (_g.meow) _g.meow.set_sound(_g.sound);
	};

	var menu = new MeowMenu({
		container	: $("#settings"),
		autosave	: true,
		menuspec	: {
			groups 	: [
				{
					label		: "grid size",
					onselect	: set_grid_size,
					options		: [
						{ label	: "small" },
						{ label	: "medium", _default : true },
						{ label	: "large" },
						{ label	: "huge" },
					]
				},
				{
					label		: "difficulty",
					onselect	: set_difficulty,
					options		: [
						{ label	: "easy" },
						{ label	: "medium", _default : true },
						{ label	: "hard" },
					]
				},
				{
					label		: "sound",
					onselect	: set_sound,
					options		: [
						{ label	: "on", _default : true },
						{ label	: "off" },
					]
				},
			],

			classes_button : "",
			classes_header : "",
		}
	});

	menu.load();
	menu.render();
}

function _attach_behavior() {

	// New game

	$("#menu_newgame").click(function() {
		var x = _g.gridsize[0];
		var y = _g.gridsize[1];

		_g.meow = new Meow({
			container	: $("#container"),
			gridsize	: _g.gridsize,
			minemult	: _g.minemult,
			sound		: _g.sound,
		});

		_set_nhints(Math.round(x*y/100) + 1);
	});

	$("#menu_settings").click(function() {
		$("#settings").show().modal();
	});

	$("#menu_hint").click(function() {
		var nhints = _g.hints;

		if (nhints > 0) {
			if (_g.meow.hint())
				nhints--;
		}

		_set_nhints(nhints);
	});
}

function _set_nhints(n) {
	var hintbtn = $("#menu_hint");
	var hinttxt = hintbtn.html();

	if (hinttxt.match(/\)$/))
		hinttxt = hinttxt.replace(/\(\d*\)$/, "(" + n + ")");
	else
		hinttxt += " (" + n + ")";

	hintbtn.html(hinttxt);
	_g.hints = n;
}
