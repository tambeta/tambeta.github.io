
// A class for constructing a menu based on a simple specification;
// an Object with keys:
//
// - groups: Array of Objects with keys
// 	 * label    - displayed label
//   * id       - if not provided, then `label` with non-alphanumeric
//                 characters replaced with `_`
//   * onselect - callback receiving value of `id`
//   * options  - Array of Buttons
//
// - classes_button: CSS classes added to buttons
// - classes_header: CSS classes added to headers
//
// Types:
//
// - Button: Object with keys `label` and `id` with same semantics as for
//   Group. If the key `_default` is present and true, this is considered
//   the default option of the group.


function MeowMenu(attrs) {
	var _this = this;
	var defaults = {

		// Arguments to pass

		container   : null,    	// jQuery
		menuspec	: [],
		autosave	: false, 	// automatically save state to localStorage

		// Private fields

		_state		: null,
	};
	attrs = $.extend({}, defaults, attrs);
	$.extend(this, attrs);

	if (!attrs.container || attrs.container.length != 1)
		throw new Error("The `container` attribute is required");
}

MeowMenu.prototype.render = function() {
	var _this = this;
	var ms = _this.menuspec;
	var container = _this.container;
	var cls_btn = ms.classes_button || "";
	var cls_hdr = ms.classes_header || "";

	container.empty();

	// Implement menuspec

	$.each(ms.groups, function(i, group) {
		var html = "";
		var glabel = group.label;
		var gid = group.id || MeowMenu.canonical_id(glabel);
		var cb = group.onselect;
		var gopts = group.options || [];
		var domid = "_meowmenu_group_" + gid;

		if (!glabel)
			throw new Error("label is a required key for menuspec group");

		// Button group header

		html +=
			"<h2 class=\"_meowmenu_header " + cls_hdr + "\">" + glabel + "</h2>" +
			"<div class=\"_meowmenu_group\" id=\"" + domid + "\" data-id=\"" + gid + "\">";

		// Button group

		$.each(gopts, function(i, v) {
			var label = v.label;
			var id = v.id || MeowMenu.canonical_id(label);
			var _default = v._default || "";

			if (!label) {
				throw new Error(
					"label is a required key for menuspec group option, " +
					"not present for \"" + glabel + "\""
				);
			}
			if (_default)
				_default = "data-default=\"true\""

			html +=
				"<a href=\"javascript:void(0);\" class=\"_meowmenu_btn " + cls_btn +
				"\" data-id=\"" + id + "\" " + _default + ">" + label + "</a>";
		});

		html += "</div>";
		container.append(html);

		// Toggling behavior

		$("#" + domid + " ._meowmenu_btn").click(function() {
			var btn = $(this);
			var group = btn.parents("._meowmenu_group");
			var btnid = btn.attr("data-id");
			var state = _this._state;

			group.find("._meowmenu_btn")
				.removeClass("_meowmenu_btn_on");
			btn.addClass("_meowmenu_btn_on");

			if (cb instanceof Function)
				cb.apply(btn, [btnid, gid]);

			if (!state)
				state = {};
			state[gid] = btnid;
			_this._state = state;
			if (_this.autosave)
				_this.save();
		});
	});

	// Load state if present, defaults otherwise

	if (_this._state)
		_this.load(_this._state);
	else
		$("._meowmenu_btn[data-default=true]").click();
}

MeowMenu.prototype.save = function() {

	// Save state to localStorage. Returns false if no
	// localStorage or no state recorded.

	var ls = window.localStorage;
	var state = this._state;

	if (!(ls && ls instanceof Storage) || !state)
		return false;

	ls.setItem("_meowmenu", JSON.stringify(state))
	return true;
}

MeowMenu.prototype.load = function(passed_state) {

	// Load state from localStorage or passed state. Returns false if no
	// localStorage or nothing to load

	var ls = window.localStorage;
	var state;

	if (!(ls && ls instanceof Storage))
		return false;
	if (!(state = passed_state || ls.getItem("_meowmenu")))
		return false;

	if ($.type(state) !== "object")
		state = JSON.parse(state);
	$.each(state, function(gid, btnid) {
		$("._meowmenu_btn[data\-id=" + btnid + "]").click(); });
	this._state = state;
	return true;
}

MeowMenu.canonical_id = function(id) {
	id = String(id)
		.toLowerCase()
		.replace(/(^\s+|\s+$)/g, "")
		.replace(/\s+/g, " ")
		.replace(/[^a-z0-9]/g, "_");
	return id;
}
