import { flushSync } from '../../../../src/index-client.js';
import { test } from '../../test';

export default test({
	test({ assert, raf, target }) {
		const btn = target.querySelector('button');

		// in
		btn?.click();
		flushSync();
		assert.htmlEqual(
			target.innerHTML,
			'<button>toggle</button><p style="opacity: 0;">delayed fade</p>'
		);
		raf.tick(1);
		assert.htmlEqual(
			target.innerHTML,
			'<button>toggle</button><p style="opacity: 0;">delayed fade</p>'
		);

		raf.tick(99);
		assert.htmlEqual(
			target.innerHTML,
			'<button>toggle</button><p style="opacity: 0;">delayed fade</p>'
		);

		raf.tick(150);
		assert.htmlEqual(
			target.innerHTML,
			'<button>toggle</button><p style="opacity: 0.5;">delayed fade</p>'
		);

		raf.tick(201);
		assert.htmlEqual(target.innerHTML, '<button>toggle</button><p style="">delayed fade</p>');

		// out
		btn?.click();
		flushSync();
		raf.tick(75);
		assert.htmlEqual(target.innerHTML, '<button>toggle</button><p style="">delayed fade</p>');

		raf.tick(150);
		assert.htmlEqual(
			target.innerHTML,
			'<button>toggle</button><p style="opacity: 0.5;">delayed fade</p>'
		);
	}
});
