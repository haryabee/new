/* generated by Svelte vX.Y.Z */
import {
	SvelteComponent,
	append,
	create_animation,
	detach,
	element,
	empty,
	fix_and_destroy_block,
	fix_position,
	init,
	insert,
	noop,
	safe_not_equal,
	set_data,
	text,
	update_keyed_each
} from "svelte/internal";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	return child_ctx;
}

// (19:0) {#each things as thing (thing.id)}
function create_each_block(key_1, ctx) {
	let div;
	let t_value = ctx[1].name + "";
	let t;
	let rect;
	let stop_animation = noop;

	return {
		key: key_1,
		first: null,
		c() {
			div = element("div");
			t = text(t_value);
			this.first = div;
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty & 1 && t_value !== (t_value = ctx[1].name + "")) set_data(t, t_value);
		},
		r() {
			rect = div.getBoundingClientRect();
		},
		f() {
			fix_position(div);
			stop_animation();
		},
		a() {
			stop_animation();
			stop_animation = create_animation(div, rect, foo, {});
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function create_fragment(ctx) {
	let each_blocks = [];
	let each_1_lookup = new Map();
	let each_1_anchor;
	let each_value = ctx[0];
	const get_key = ctx => ctx[1].id;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, [dirty]) {
			const each_value = ctx[0];
			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
			each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, fix_and_destroy_block, create_each_block, each_1_anchor, get_each_context);
			for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
		},
		i: noop,
		o: noop,
		d(detaching) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}

			if (detaching) detach(each_1_anchor);
		}
	};
}

function foo(node, animation, params) {
	const dx = animation.from.left - animation.to.left;
	const dy = animation.from.top - animation.to.top;

	return {
		delay: params.delay,
		duration: 100,
		tick: (t, u) => {
			node.dx = u * dx;
			node.dy = u * dy;
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { things } = $$props;

	$$self.$set = $$props => {
		if ("things" in $$props) $$invalidate(0, things = $$props.things);
	};

	return [things];
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { things: 0 });
	}
}

export default Component;