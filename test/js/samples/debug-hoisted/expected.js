/* generated by Svelte vX.Y.Z */
import {
	SvelteComponentDev,
	dispatch_dev,
	init,
	noop,
	safe_not_equal,
	validate_slots
} from "svelte/internal";

const file = undefined;

function create_fragment(ctx) {
	const block = {
		c: function create() {
			{
				const obj = /*obj*/ ctx[0];
				const kobzol = /*kobzol*/ ctx[1];
				console.log({ obj, kobzol });
				debugger;
			}
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: noop,
		p: function update(ctx, [dirty]) {
			if (dirty & /*obj, kobzol*/ 3) {
				const obj = /*obj*/ ctx[0];
				const kobzol = /*kobzol*/ ctx[1];
				console.log({ obj, kobzol });
				debugger;
			}
		},
		i: noop,
		o: noop,
		d: noop
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Component", slots, []);
	let obj = { x: 5 };
	let kobzol = 5;
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<Component> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({ obj, kobzol });

	$$self.$inject_state = $$props => {
		if ("obj" in $$props) $$invalidate(0, obj = $$props.obj);
		if ("kobzol" in $$props) $$invalidate(1, kobzol = $$props.kobzol);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [obj, kobzol];
}

class Component extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {}, null);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Component",
			options,
			id: create_fragment.name
		});
	}
}

export default Component;