import { test } from '../../test';

export default test({
	skip: true,
	compileOptions: {
		// @ts-expect-error TODO see if we need to bring it back: https://github.com/sveltejs/svelte/pull/6835
		enableSourcemap: { js: true }
	},
	client: [],
	css: null
});
