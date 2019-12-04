/* generated by Svelte vX.Y.Z */
import {
	SvelteComponentDev,
	add_location,
	append_dev,
	detach_dev,
	dispatch_dev,
	element,
	init,
	insert_dev,
	noop,
	safe_not_equal,
	set_data_dev,
	space,
	subscribe,
	text,
	validate_store
} from "svelte/internal";

const file = undefined;

function create_fragment(ctx) {
	let p;
	let t0;
	let t1;
	let t2;
	let t3;
	let t4;
	let t5;
	let t6;

	const block = {
		c: function create() {
			p = element("p");
			t0 = text(/*$prop*/ ctx[1]);
			t1 = space();
			t2 = text(/*realName*/ ctx[0]);
			t3 = space();
			t4 = text(/*local*/ ctx[2]);
			t5 = space();
			t6 = text(priv);
			add_location(p, file, 13, 0, 232);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
			append_dev(p, t0);
			append_dev(p, t1);
			append_dev(p, t2);
			append_dev(p, t3);
			append_dev(p, t4);
			append_dev(p, t5);
			append_dev(p, t6);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*$prop*/ 2) set_data_dev(t0, /*$prop*/ ctx[1]);
			if (dirty & /*realName*/ 1) set_data_dev(t2, /*realName*/ ctx[0]);
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(p);
		}
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

const priv = "priv";

function instance($$self, $$props, $$invalidate) {
	let $prop,
		$$unsubscribe_prop = noop,
		$$subscribe_prop = () => ($$unsubscribe_prop(), $$unsubscribe_prop = subscribe(prop, $$value => $$invalidate(1, $prop = $$value)), prop);

	$$self.$$.on_destroy.push(() => $$unsubscribe_prop());
	let { prop } = $$props;
	validate_store(prop, "prop");
	$$subscribe_prop();
	let { alias: realName } = $$props;
	let local;
	const writable_props = ["prop", "alias"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Component> was created with unknown prop '${key}'`);
	});

	$$self.$set = $$props => {
		if ("prop" in $$props) $$subscribe_prop($$invalidate(3, prop = $$props.prop));
		if ("alias" in $$props) $$invalidate(0, realName = $$props.alias);
	};

	$$self.$capture_state = () => ({ prop, realName, local });

	$$self.$inject_state = $$props => {
		if ("prop" in $$props) $$subscribe_prop($$invalidate(3, prop = $$props.prop));
		if ("realName" in $$props) $$invalidate(0, realName = $$props.realName);
		if ("local" in $$props) $$invalidate(2, local = $$props.local);
	};

	let computed;
	$: computed = local * 2;
	return [realName, $prop, local, prop];
}

class Component extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, { prop: 3, alias: 0 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Component",
			options,
			id: create_fragment.name
		});

		const { ctx } = this.$$;
		const props = options.props || ({});

		if (/*prop*/ ctx[3] === undefined && !("prop" in props)) {
			console.warn("<Component> was created without expected prop 'prop'");
		}

		if (/*realName*/ ctx[0] === undefined && !("alias" in props)) {
			console.warn("<Component> was created without expected prop 'alias'");
		}
	}

	get prop() {
		throw new Error("<Component>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set prop(value) {
		throw new Error("<Component>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get alias() {
		throw new Error("<Component>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set alias(value) {
		throw new Error("<Component>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

export default Component;