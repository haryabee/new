import { proxy } from './proxy';
import { assert, test } from 'vitest';

test('does not mutate the original object', () => {
	const original = { x: 1 };
	const state = proxy(original);

	state.x = 2;

	assert.equal(original.x, 1);
	assert.equal(state.x, 2);
});

test('preserves getters', () => {
	let count = 0;
	const original = {
		count: 0,
		get x() {
			this.count += 1;
			count += 1;
			return 42;
		}
	};

	const state = proxy(original);

	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	state.x;
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	state.x;

	assert.equal(original.count, 0);
	assert.equal(count, 2);
	assert.equal(state.count, 2);
});

test('defines a property', () => {
	const original = { y: 0 };
	const state = proxy<any>(original);

	let value = 0;

	Object.defineProperty(state, 'x', {
		value: 1
	});
	Object.defineProperty(state, 'y', {
		value: 1
	});

	assert.equal(state.x, 1);
	assert.deepEqual(Object.getOwnPropertyDescriptor(state, 'x'), {
		configurable: true,
		writable: true,
		value: 1,
		enumerable: true
	});

	assert.ok(!('x' in original));
	assert.deepEqual(Object.getOwnPropertyDescriptor(original, 'y'), {
		configurable: true,
		writable: true,
		value: 0,
		enumerable: true
	});

	assert.throws(
		() =>
			Object.defineProperty(state, 'x', {
				get: () => value,
				set: (v) => (value = v)
			}),
		/state_descriptors_fixed/
	);
});
