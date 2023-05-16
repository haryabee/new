import { create_deferred } from '../../../../helpers';

let deferred;

export default {
	before_test() {
		deferred = create_deferred();
	},

	get props() {
		return { thePromise: deferred.promise };
	},

	html: `
		<br>
		<br>
		<p>the promise is pending</p>
	`,

	async test({ assert, component, target }) {
		deferred.resolve();

		await deferred.promise;

		assert.htmlEqual(
			target.innerHTML,
			`
			<p>the promise is resolved</p>
			<br>
			<p>the promise is resolved</p>
			<br>
			<p>the promise is resolved</p>
		`
		);

		const local = (deferred = create_deferred());

		component.thePromise = local.promise;

		assert.htmlEqual(
			target.innerHTML,
			`
			<br>
			<br>
			<p>the promise is pending</p>
		`
		);

		create_deferred().reject(new Error('random error'));

		local.reject(new Error('something broke'));

		try {
			await local.promise;
		} catch {}

		assert.htmlEqual(
			target.innerHTML,
			`<p>oh no! something broke</p>
			<br />
			<br />`
		);
	}
};
