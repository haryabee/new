import {
	run_all,
	subscribe,
	noop,
	safe_not_equal,
	is_function,
	get_store_value
} from '../internal';

const subscriber_queue = [];

/**
 * Creates a `Readable` store that allows reading by subscription.
 * @param {T} value  initial value
 * @param {StartStopNotifier<T>} start  undefined
 * @returns {import("/Users/elliottjohnson/dev/sveltejs/svelte/index.ts-to-jsdoc").Readable<T>}
 */
export function readable(value, start) {
	return {
		subscribe: writable(value, start).subscribe
	};
}

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {T} value  initial value
 * @param {StartStopNotifier<T>} start  undefined
 * @returns {import("/Users/elliottjohnson/dev/sveltejs/svelte/index.ts-to-jsdoc").Writable<T>}
 */
export function writable(value, start = noop) {
	/** @type {Unsubscriber} */
	let stop;
	/** @type {Set<SubscribeInvalidateTuple<T>>} */
	const subscribers = new Set();
	/** @param {T} new_value
	 * @returns {void}
	 */
	function set(new_value) {
		if (safe_not_equal(value, new_value)) {
			value = new_value;
			if (stop) {
				// store is ready
				const run_queue = !subscriber_queue.length;
				for (const subscriber of subscribers) {
					subscriber[1]();
					subscriber_queue.push(subscriber, value);
				}
				if (run_queue) {
					for (let i = 0; i < subscriber_queue.length; i += 2) {
						subscriber_queue[i][0](subscriber_queue[i + 1]);
					}
					subscriber_queue.length = 0;
				}
			}
		}
	}
	/**
	 * @param {Updater<T>} fn
	 * @returns {void}
	 */
	function update(fn) {
		set(fn(value));
	}
	/**
	 * @param {Subscriber<T>} run
	 * @param {Invalidator<T>} invalidate
	 * @returns {import("/Users/elliottjohnson/dev/sveltejs/svelte/index.ts-to-jsdoc").Unsubscriber}
	 */
	function subscribe(run, invalidate = noop) {
		/** @type {SubscribeInvalidateTuple<T>} */
		const subscriber = [run, invalidate];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			stop = start(set, update) || noop;
		}
		run(value);
		return () => {
			subscribers.delete(subscriber);
			if (subscribers.size === 0 && stop) {
				stop();
				stop = null;
			}
		};
	}
	return { set, update, subscribe };
}

/**
 * @param {Stores} stores
 * @param {Function} fn
 * @param {T} initial_value
 * @returns {import("/Users/elliottjohnson/dev/sveltejs/svelte/index.ts-to-jsdoc").Readable<T>}
 */
export function derived(stores, fn, initial_value) {
	const single = !Array.isArray(stores);
	/** @type {Array<Readable<any>>} */
	const stores_array = single ? [stores] : stores;
	if (!stores_array.every(Boolean)) {
		throw new Error('derived() expects stores as input, got a falsy value');
	}
	const auto = fn.length < 2;
	return readable(initial_value, (set, update) => {
		let started = false;
		const values = [];
		let pending = 0;
		let cleanup = noop;
		const sync = () => {
			if (pending) {
				return;
			}
			cleanup();
			const result = fn(single ? values[0] : values, set, update);
			if (auto) {
				set(result);
			} else {
				cleanup = is_function(result) ? result : noop;
			}
		};
		const unsubscribers = stores_array.map((store, i) =>
			subscribe(
				store,
				(value) => {
					values[i] = value;
					pending &= ~(1 << i);
					if (started) {
						sync();
					}
				},
				() => {
					pending |= 1 << i;
				}
			)
		);
		started = true;
		sync();
		return function stop() {
			run_all(unsubscribers);
			cleanup();
			// We need to set this to false because callbacks can still happen despite having unsubscribed:
			// Callbacks might already be placed in the queue which doesn't know it should no longer
			// invoke this derived store.
			started = false;
		};
	});
}

/**
 * Takes a store and returns a new one derived from the old one that is readable.
 *
 * @param {Readable<T>} store  - store to make readonly
 * @returns {import("/Users/elliottjohnson/dev/sveltejs/svelte/index.ts-to-jsdoc").Readable<T>}
 */
export function readonly(store) {
	return {
		subscribe: store.subscribe.bind(store)
	};
}

/**
 * Get the current value from a store by subscribing and immediately unsubscribing.
 * @param store readable
 */
export { get_store_value as get };

/**
 * @typedef {(value: T) => void} Subscriber
 * @template T
 */

/** @typedef {() => void} Unsubscriber */

/**
 * @typedef {(value: T) => T} Updater
 * @template T
 */

/**
 * @typedef {(value?: T) => void} Invalidator
 * @template T
 */

/**
 * @typedef {(
 * 	set: (value: T) => void,
 * 	update: (fn: Updater<T>) => void
 * ) => void | (() => void)} StartStopNotifier
 * @template T
 */

/**
 * @typedef {[Subscriber<T>, Invalidator<T>]} SubscribeInvalidateTuple
 * @template T
 */

/** @typedef {Readable<any> | [Readable<any>, ...Array<Readable<any>>] | Array<Readable<any>>} Stores */

/**
 * @typedef {T extends Readable<infer U>
 * 	? U
 * 	: { [K in keyof T]: T[K] extends Readable<infer U> ? U : never }} StoresValues
 * @template T
 */

/**
 * Readable interface for subscribing.
 * @typedef {Object} Readable
 */

/**
 * Writable interface for both updating and subscribing.
 * @typedef {Object} Writable
 */
