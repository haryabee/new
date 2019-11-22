/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	detach,
	element,
	init,
	insert,
	noop,
	safe_not_equal,
	set_style
} from "svelte/internal";

function create_fragment(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			set_style(div, "background", "url(data:image/png;base64," + ctx[0] + ")");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, [changed]) {
			if (changed & 1) {
				set_style(div, "background", "url(data:image/png;base64," + ctx[0] + ")");
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { data } = $$props;

	$$self.$set = $$props => {
		if ("data" in $$props) $$invalidate(0, data = $$props.data);
	};

	return [data];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { data: 0 });
	}
}

export default Component;