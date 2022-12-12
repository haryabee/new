/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	append,
	assign,
	detach,
	empty,
	get_spread_update,
	init,
	insert,
	noop,
	safe_not_equal,
	set_svg_attributes,
	svg_element
} from "svelte/internal";

function create_dynamic_element_1(ctx) {
	return { c: noop, m: noop, p: noop, d: noop };
}

// (1:0) <svelte:element this="svg" xmlns="http://www.w3.org/2000/svg">
function create_dynamic_element(ctx) {
	let svelte_element1;
	let svelte_element0;
	let svelte_element0_levels = [{ xmlns: "http://www.w3.org/2000/svg" }];
	let svelte_element0_data = {};

	for (let i = 0; i < svelte_element0_levels.length; i += 1) {
		svelte_element0_data = assign(svelte_element0_data, svelte_element0_levels[i]);
	}

	let svelte_element1_levels = [{ xmlns: "http://www.w3.org/2000/svg" }];
	let svelte_element1_data = {};

	for (let i = 0; i < svelte_element1_levels.length; i += 1) {
		svelte_element1_data = assign(svelte_element1_data, svelte_element1_levels[i]);
	}

	return {
		c() {
			svelte_element1 = svg_element("svg");
			svelte_element0 = svg_element("path");
			set_svg_attributes(svelte_element0, svelte_element0_data);
			set_svg_attributes(svelte_element1, svelte_element1_data);
		},
		m(target, anchor) {
			insert(target, svelte_element1, anchor);
			append(svelte_element1, svelte_element0);
		},
		p(ctx, dirty) {
			svelte_element0_data = get_spread_update(svelte_element0_levels, [{ xmlns: "http://www.w3.org/2000/svg" }]);
			set_svg_attributes(svelte_element0, svelte_element0_data);
			svelte_element1_data = get_spread_update(svelte_element1_levels, [{ xmlns: "http://www.w3.org/2000/svg" }]);
			set_svg_attributes(svelte_element1, svelte_element1_data);
		},
		d(detaching) {
			if (detaching) detach(svelte_element1);
		}
	};
}

function create_fragment(ctx) {
	let previous_tag = "svg";
	let svelte_element1_anchor;
	let svelte_element1 = "svg" && create_dynamic_element(ctx);

	return {
		c() {
			if (svelte_element1) svelte_element1.c();
			svelte_element1_anchor = empty();
		},
		m(target, anchor) {
			if (svelte_element1) svelte_element1.m(target, anchor);
			insert(target, svelte_element1_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if ("svg") {
				if (!previous_tag) {
					svelte_element1 = create_dynamic_element(ctx);
					svelte_element1.c();
					svelte_element1.m(svelte_element1_anchor.parentNode, svelte_element1_anchor);
				} else if (safe_not_equal(previous_tag, "svg")) {
					svelte_element1.d(1);
					svelte_element1 = create_dynamic_element(ctx);
					svelte_element1.c();
					svelte_element1.m(svelte_element1_anchor.parentNode, svelte_element1_anchor);
				} else {
					svelte_element1.p(ctx, dirty);
				}
			} else if (previous_tag) {
				svelte_element1.d(1);
				svelte_element1 = null;
			}

			previous_tag = "svg";
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(svelte_element1_anchor);
			if (svelte_element1) svelte_element1.d(detaching);
		}
	};
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment, safe_not_equal, {});
	}
}

export default Component;
