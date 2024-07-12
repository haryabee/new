import { DEV } from 'esm-env';
import { define_property, is_array, is_frozen, object_freeze } from '../shared/utils.js';
import { STATE_FROZEN_SYMBOL, STATE_SYMBOL } from './constants.js';

/**
 * Expects a value that was wrapped with `freeze` and makes it frozen in DEV.
 * @template T
 * @param {T} value
 * @returns {Readonly<T>}
 */
export function freeze(value) {
	if (
		typeof value === 'object' &&
		value !== null &&
		!is_frozen(value) &&
		!(STATE_FROZEN_SYMBOL in value)
	) {
		var copy = /** @type {T} */ (value);

		// If the object is already proxified, then clone the value
		if (STATE_SYMBOL in value) {
			copy = /** @type {T} */ (is_array(value) ? [...value] : { ...value });
		}

		define_property(copy, STATE_FROZEN_SYMBOL, {
			value: true,
			writable: true,
			enumerable: false
		});

		// Freeze the object in DEV
		if (DEV) {
			object_freeze(copy);
		}

		return /** @type {Readonly<T>} */ (copy);
	}

	return value;
}
