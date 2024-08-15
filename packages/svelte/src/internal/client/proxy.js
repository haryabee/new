/** @import { ProxyMetadata, Source } from '#client' */
import { DEV } from 'esm-env';
import { get, current_component_context, current_effect } from './runtime.js';
import {
	array_prototype,
	get_descriptor,
	get_prototype_of,
	is_array,
	object_prototype
} from '../shared/utils.js';
import { check_ownership, widen_ownership } from './dev/ownership.js';
import { source, set } from './reactivity/sources.js';
import { UNINITIALIZED } from '../../constants.js';
import * as e from './errors.js';

/**
 * @type {WeakMap<any, ProxyMetadata<any>>}
 */
export const proxies = new WeakMap();

/**
 * @template T
 * @param {T} value
 * @param {ProxyMetadata | null} [parent]
 * @param {Source<T>} [prev] dev mode only
 * @returns {T}
 */
export function proxy(value, parent = null, prev) {
	if (typeof value === 'object' && value != null) {
		var metadata = /** @type {ProxyMetadata<any>} */ (proxies.get(value));

		// If we have an existing proxy, return it...
		if (metadata) {
			// ...unless the proxy belonged to a different object, because
			// someone copied the state symbol using `Reflect.ownKeys(...)`
			if (metadata.t === value || metadata.p === value) {
				if (DEV) {
					// Since original parent relationship gets lost, we need to copy over ancestor owners
					// into current metadata. The object might still exist on both, so we need to widen it.
					widen_ownership(metadata, metadata);
					metadata.parent = parent;
				}

				return metadata.p;
			}
		}

		var prototype = get_prototype_of(value);

		if (prototype === object_prototype || prototype === array_prototype) {
			var proxy = new Proxy(value, state_proxy_handler);

			// @ts-expect-error missing dev-only properties
			metadata = {
				s: new Map(),
				v: source(0),
				a: is_array(value),
				p: proxy,
				t: value
			};

			proxies.set(value, metadata);
			proxies.set(proxy, metadata);

			if (DEV) {
				metadata.parent = parent;

				if (prev) {
					// Reuse owners from previous state; necessary because reassignment is not guaranteed to have correct component context.
					// If no previous proxy exists we play it safe and assume ownerless state
					var prev_owners = proxies.get(prev?.v)?.owners;
					metadata.owners = prev_owners ? new Set(prev_owners) : null;
				} else {
					metadata.owners =
						parent === null
							? current_component_context !== null
								? new Set([current_component_context.function])
								: null
							: new Set();
				}
			}

			return proxy;
		}
	}

	return value;
}

/**
 * @param {Source<number>} signal
 * @param {1 | -1} [d]
 */
function update_version(signal, d = 1) {
	set(signal, signal.v + d);
}

/** @type {ProxyHandler<any>} */
const state_proxy_handler = {
	defineProperty(target, prop, descriptor) {
		if (
			!('value' in descriptor) ||
			descriptor.configurable === false ||
			descriptor.enumerable === false ||
			descriptor.writable === false
		) {
			e.state_descriptors_fixed();
		}

		var metadata = /** @type {ProxyMetadata} */ (proxies.get(target));
		var value = descriptor.value;

		var s = metadata.s.get(prop);
		if (s === undefined) {
			s = source(value);
			metadata.s.set(prop, s);
		} else {
			set(s, proxy(value, metadata));
		}

		return true;
	},

	deleteProperty(target, prop) {
		var metadata = /** @type {ProxyMetadata} */ (proxies.get(target));
		var s = metadata.s.get(prop);
		var exists = s !== undefined ? s.v !== UNINITIALIZED : prop in target;

		if (s !== undefined) {
			set(s, UNINITIALIZED);
		}

		if (exists) {
			update_version(metadata.v);
		}

		return exists;
	},

	get(target, prop, receiver) {
		var metadata = /** @type {ProxyMetadata} */ (proxies.get(target));
		var s = metadata.s.get(prop);
		var exists = prop in target;

		// create a source, but only if it's an own property and not a prototype property
		if (s === undefined && (!exists || get_descriptor(target, prop)?.writable)) {
			s = source(proxy(exists ? target[prop] : UNINITIALIZED, metadata));
			metadata.s.set(prop, s);
		}

		if (s !== undefined) {
			var value = get(s);
			return value === UNINITIALIZED ? undefined : value;
		}

		return Reflect.get(target, prop, receiver);
	},

	getOwnPropertyDescriptor(target, prop) {
		var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
		var metadata = /** @type {ProxyMetadata} */ (proxies.get(target));

		if (descriptor && 'value' in descriptor) {
			var s = metadata.s.get(prop);

			if (s) {
				descriptor.value = get(s);
			}
		} else if (descriptor === undefined) {
			var source = metadata.s.get(prop);
			var value = source?.v;

			if (source !== undefined && value !== UNINITIALIZED) {
				return {
					enumerable: true,
					configurable: true,
					value,
					writable: true
				};
			}
		}

		return descriptor;
	},

	has(target, prop) {
		var metadata = /** @type {ProxyMetadata} */ (proxies.get(target));
		var s = metadata.s.get(prop);
		var has = (s !== undefined && s.v !== UNINITIALIZED) || Reflect.has(target, prop);

		if (
			s !== undefined ||
			(current_effect !== null && (!has || get_descriptor(target, prop)?.writable))
		) {
			if (s === undefined) {
				s = source(has ? proxy(target[prop], metadata) : UNINITIALIZED);
				metadata.s.set(prop, s);
			}
			var value = get(s);
			if (value === UNINITIALIZED) {
				return false;
			}
		}
		return has;
	},

	set(target, prop, value, receiver) {
		var metadata = /** @type {ProxyMetadata} */ (proxies.get(target));
		var s = metadata.s.get(prop);
		var has = prop in target;

		// If we haven't yet created a source for this property, we need to ensure
		// we do so otherwise if we read it later, then the write won't be tracked and
		// the heuristics of effects will be different vs if we had read the proxied
		// object property before writing to that property.
		if (s === undefined) {
			if (!has || get_descriptor(target, prop)?.writable) {
				s = source(undefined);
				set(s, proxy(value, metadata));
				metadata.s.set(prop, s);
			}
		} else {
			has = s.v !== UNINITIALIZED;
			set(s, proxy(value, metadata));
		}
		var is_array = metadata.a;

		if (DEV) {
			/** @type {ProxyMetadata | undefined} */
			var prop_metadata = proxies.get(value);
			if (prop_metadata && prop_metadata?.parent !== metadata) {
				widen_ownership(metadata, prop_metadata);
			}
			check_ownership(metadata);
		}

		// variable.length = value -> clear all signals with index >= value
		if (is_array && prop === 'length') {
			for (var i = value; i < target.length; i += 1) {
				var other_s = metadata.s.get(i + '');
				if (other_s !== undefined) set(other_s, UNINITIALIZED);
			}
		}

		var descriptor = Reflect.getOwnPropertyDescriptor(target, prop);

		// Set the new value before updating any signals so that any listeners get the new value
		if (descriptor?.set) {
			descriptor.set.call(receiver, value);
		}

		if (!has) {
			// If we have mutated an array directly, we might need to
			// signal that length has also changed. Do it before updating metadata
			// to ensure that iterating over the array as a result of a metadata update
			// will not cause the length to be out of sync.
			if (is_array && typeof prop === 'string') {
				var ls = metadata.s.get('length');

				if (ls !== undefined) {
					var n = Number(prop);

					if (Number.isInteger(n) && n >= ls.v) {
						set(ls, n + 1);
					}
				}
			}

			update_version(metadata.v);
		}

		return true;
	},

	ownKeys(target) {
		var metadata = /** @type {ProxyMetadata} */ (proxies.get(target));

		get(metadata.v);

		var own_keys = Reflect.ownKeys(target).filter((key) => {
			var source = metadata.s.get(key);
			return source === undefined || source.v !== UNINITIALIZED;
		});

		for (var [key, source] of metadata.s) {
			if (source.v !== UNINITIALIZED && !(key in target)) {
				own_keys.push(key);
			}
		}

		return own_keys;
	}
};

if (DEV) {
	state_proxy_handler.setPrototypeOf = () => {
		e.state_prototype_fixed();
	};
}

/**
 * @param {any} value
 */
export function get_proxied_value(value) {
	var metadata = proxies.get(value);
	return metadata ? metadata.p : value;
}

/**
 * @param {any} a
 * @param {any} b
 */
export function is(a, b) {
	return Object.is(get_proxied_value(a), get_proxied_value(b));
}
