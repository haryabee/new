/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	attr,
	detach,
	element,
	init,
	insert,
	listen,
	noop,
	safe_not_equal
} from "svelte/internal";

function create_fragment(ctx) {
	let input;
	let dispose;

	return {
		c() {
			input = element("input");
			attr(input, "type", "checkbox");
			dispose = listen(input, "change", ctx[1]);
		},
		m(target, anchor) {
			insert(target, input, anchor);
			input.checked = ctx[0];
		},
		p(ctx, [changed]) {
			if (changed & 1) {
				input.checked = ctx[0];
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			dispose();
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { foo } = $$props;

	function input_change_handler() {
		foo = this.checked;
		$$invalidate(0, foo);
	}

	$$self.$set = $$props => {
		if ("foo" in $$props) $$invalidate(0, foo = $$props.foo);
	};

	return [foo, input_change_handler];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { foo: 0 });
	}
}

export default Component;