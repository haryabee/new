export default {
	skip_if_ssr: true,
	skip_if_hydrate: true,
	skip_if_hydrate_from_ssr: true,

	async test({ raf, assert, component, window }) {
		component.visible = true;
		raf.tick(100)
		component.visible = false;
		raf.tick(200)
		raf.tick(60)

		assert.htmlEqual(
			window.document.head.innerHTML,
			''
		);
	}
};
