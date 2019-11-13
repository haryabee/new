/* generated by Svelte vX.Y.Z */
import { SvelteComponent, init, safe_not_equal } from "svelte/internal";

const SOME_CONSTANT = 42;

function foo(bar) {
	console.log(bar);
}

class Component extends SvelteComponent {
	constructor(options) {
		super();
		this.exportProps = { foo: 0 };
		init(this, options, null, null, safe_not_equal, this.exportProps);
	}

	get foo() {
		return foo;
	}
}

export default Component;
export { SOME_CONSTANT };