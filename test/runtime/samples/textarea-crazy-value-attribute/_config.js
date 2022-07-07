export default {
	skip_if_hydrate_from_ssr: true,
	skip_if_hydrate: true,
	skip_if_ssr: true,

	test({ assert, target }) {
		const textarea = target.querySelector('textarea');
		const one_million = 1000000
		assert.equal(textarea.value.length > one_million, true);
	}
};
