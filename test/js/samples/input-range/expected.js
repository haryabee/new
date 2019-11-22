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
	run_all,
	safe_not_equal,
	set_input_value,
	to_number
} from "svelte/internal";

function create_fragment(ctx) {
	let input;
	let dispose;

	return {
		c() {
			input = element("input");
			attr(input, "type", "range");
			dispose = [listen(input, "change", ctx[1]), listen(input, "input", ctx[1])];
		},
		m(target, anchor) {
			insert(target, input, anchor);
			set_input_value(input, ctx[0]);
		},
		p(ctx, [dirty]) {
			if (dirty & 1) {
				set_input_value(input, ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			run_all(dispose);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { value } = $$props;

	function input_change_input_handler() {
		value = to_number(this.value);
		$$invalidate(0, value);
	}

	$$self.$set = $$props => {
		if ("value" in $$props) $$invalidate(0, value = $$props.value);
	};

	return [value, input_change_input_handler];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { value: 0 });
	}
}

export default Component;