/* generated by Svelte vX.Y.Z */
import { SvelteComponent as SvelteComponent_1, createElement, detachNode, init, insert, noop, run, safe_not_equal, setInputType } from "svelte/internal";

function create_fragment(component, ctx) {
	var input, current;

	return {
		c() {
			input = createElement("input");
			setInputType(input, "search");
		},

		m(target, anchor) {
			insert(target, input, anchor);
			current = true;
		},

		p: noop,

		i(target, anchor) {
			if (current) return;
			this.m(target, anchor);
		},

		o: run,

		d(detach) {
			if (detach) {
				detachNode(input);
			}
		}
	};
}

class SvelteComponent extends SvelteComponent_1 {
	constructor(options) {
		super();
		init(this, options, props => props, create_fragment, safe_not_equal);
	}
}

export default SvelteComponent;