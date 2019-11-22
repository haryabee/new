/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	detach,
	element,
	init,
	insert,
	listen,
	noop,
	safe_not_equal
} from "svelte/internal";

function create_fragment(ctx) {
	let details;
	let dispose;

	return {
		c() {
			details = element("details");

			details.innerHTML = `<summary>summary</summary>content
`;

			dispose = listen(details, "toggle", ctx[1]);
		},
		m(target, anchor) {
			insert(target, details, anchor);
			details.open = ctx[0];
		},
		p(ctx, [changed]) {
			if (changed & 1) {
				details.open = ctx[0];
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(details);
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { open } = $$props;

	function details_toggle_handler() {
		open = this.open;
		$$invalidate(0, open);
	}

	$$self.$set = $$props => {
		if ("open" in $$props) $$invalidate(0, open = $$props.open);
	};

	return [open, details_toggle_handler];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { open: 0 });
	}
}

export default Component;