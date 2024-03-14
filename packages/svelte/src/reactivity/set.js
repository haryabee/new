import { source, set } from '../internal/client/reactivity/sources.js';
import { get } from '../internal/client/runtime.js';
import { make_iterable } from './utils.js';

var read_methods = ['forEach', 'isDisjointFrom', 'isSubsetOf', 'isSupersetOf'];
var set_like_methods = ['difference', 'intersection', 'symmetricDifference', 'union'];

var inited = false;

/**
 * @template T
 */
export class ReactiveSet extends Set {
	/** @type {Map<T, import('#client').Source<boolean>>} */
	#sources = new Map();
	#version = source(0);
	#size = source(0);

	/**
	 * @param {Iterable<T> | null | undefined} [value]
	 */
	constructor(value) {
		super(value);

		if (value) {
			for (var element of value) {
				this.#sources.set(element, source(true));
			}

			this.#size.v = this.#sources.size;
		}

		if (!inited) this.#init();
	}

	// We init as part of the first instance so that we can treeshake this class
	#init() {
		inited = true;

		var proto = ReactiveSet.prototype;
		var set_proto = Set.prototype;

		/** @type {string} */
		var method;

		for (method of read_methods) {
			// @ts-ignore
			proto[method] = function (...v) {
				get(this.#version);
				// @ts-ignore
				return set_proto[method].apply(this, v);
			};
		}

		for (method of set_like_methods) {
			// @ts-ignore
			proto[method] = function (...v) {
				get(this.#version);

				// @ts-ignore
				var set = /** @type {Set<T>} */ (set_proto[method].apply(this, v));
				return new ReactiveSet(set);
			};
		}
	}

	#increment_version() {
		set(this.#version, this.#version.v + 1);
	}

	/** @param {T} value */
	has(value) {
		var s = this.#sources.get(value);

		if (s === undefined) {
			// We should always track the version in case
			// the Set ever gets this value in the future.
			get(this.#version);

			return false;
		}

		return get(s);
	}

	/** @param {T} value */
	add(value) {
		var sources = this.#sources;

		if (!sources.has(value)) {
			sources.set(value, source(true));
			set(this.#size, sources.size);
			this.#increment_version();
		}

		return super.add(value);
	}

	/** @param {T} value */
	delete(value) {
		var sources = this.#sources;
		var s = sources.get(value);

		if (s !== undefined) {
			sources.delete(value);
			set(this.#size, sources.size);
			set(s, false);
			this.#increment_version();
		}

		return super.delete(value);
	}

	clear() {
		var sources = this.#sources;

		if (sources.size !== 0) {
			set(this.#size, 0);
			for (var s of sources.values()) {
				set(s, false);
			}
			this.#increment_version();
		}

		sources.clear();
		super.clear();
	}

	keys() {
		return this.values();
	}

	values() {
		get(this.#version);

		var iterator = this.#sources.keys();

		return make_iterable(
			/** @type {IterableIterator<T>} */ ({
				next() {
					for (var value of iterator) {
						return { value, done: false };
					}

					return { done: true };
				}
			})
		);
	}

	entries() {
		var iterator = this.values();

		return make_iterable(
			/** @type {IterableIterator<[T, T]>} */ ({
				next() {
					for (var value of iterator) {
						return { value: [value, value], done: false };
					}

					return { done: true };
				}
			})
		);
	}

	[Symbol.iterator]() {
		return this.values();
	}

	get size() {
		return get(this.#size);
	}
}
