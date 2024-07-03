/** @import { StoreReferencesContainer, Source } from '#client' */
/** @import { Store } from '#shared' */
import { subscribe_to_store } from '../../../store/utils.js';
import { noop } from '../../shared/utils.js';
import { UNINITIALIZED } from '../../../constants.js';
import { get } from '../runtime.js';
import { teardown } from './effects.js';
import { mutable_source, set } from './sources.js';

/**
 * Gets the current value of a store. If the store isn't subscribed to yet, it will create a proxy
 * signal that will be updated when the store is. The store references container is needed to
 * track reassignments to stores and to track the correct component context.
 * @template V
 * @param {Store<V> | null | undefined} store
 * @param {string} store_name
 * @param {StoreReferencesContainer} stores
 * @returns {V}
 */
export function store_get(store, store_name, stores) {
	/** @type {StoreReferencesContainer[''] | undefined} */
	let entry = stores[store_name];
	const is_new = entry === undefined;

	if (is_new) {
		entry = {
			store: null,
			value: mutable_source(UNINITIALIZED),
			unsubscribe: noop
		};
		stores[store_name] = entry;
	}

	if (is_new || entry.store !== store) {
		entry.unsubscribe();
		entry.store = store ?? null;
		entry.unsubscribe = connect_store_to_signal(store, entry.value);
	}

	return get(entry.value);
}

/**
 * Unsubscribe from a store if it's not the same as the one in the store references container.
 * We need this in addition to `store_get` because someone could unsubscribe from a store but
 * then never subscribe to the new one (if any), causing the subscription to stay open wrongfully.
 * @param {Store<any> | null | undefined} store
 * @param {string} store_name
 * @param {StoreReferencesContainer} stores
 */
export function store_unsub(store, store_name, stores) {
	/** @type {StoreReferencesContainer[''] | undefined} */
	let entry = stores[store_name];

	if (entry && entry.store !== store) {
		// Don't reset store yet, so that store_get above can resubscribe to new store if necessary
		entry.unsubscribe();
		entry.unsubscribe = noop;
	}

	return store;
}

/**
 * @template V
 * @param {Store<V> | null | undefined} store
 * @param {Source<V>} source
 */
function connect_store_to_signal(store, source) {
	if (store == null) {
		set(source, undefined);
		return noop;
	}

	return subscribe_to_store(store, (v) => set(source, v));
}

/**
 * Sets the new value of a store and returns that value.
 * @template V
 * @param {Store<V>} store
 * @param {V} value
 * @returns {V}
 */
export function store_set(store, value) {
	store.set(value);
	return value;
}

/**
 * @param {StoreReferencesContainer} stores
 * @param {string} store_name
 */
export function invalidate_store(stores, store_name) {
	const store = stores[store_name];
	if (store.store) {
		store_set(store.store, store.value.v);
	}
}

/**
 * Unsubscribes from all auto-subscribed stores on destroy
 * @returns {StoreReferencesContainer}
 */
export function create_stores() {
	/** @type {StoreReferencesContainer} */
	const stores = {};

	teardown(() => {
		for (var store_name in stores) {
			const ref = stores[store_name];
			ref.unsubscribe();
		}
	});

	return stores;
}

/**
 * Updates a store with a new value.
 * @param {Store<V>} store  the store to update
 * @param {any} expression  the expression that mutates the store
 * @param {V} new_value  the new store value
 * @template V
 */
export function mutate_store(store, expression, new_value) {
	store.set(new_value);
	return expression;
}

/**
 * @param {Store<number>} store
 * @param {number} store_value
 * @param {1 | -1} [d]
 * @returns {number}
 */
export function update_store(store, store_value, d = 1) {
	store.set(store_value + d);
	return store_value;
}

/**
 * @param {Store<number>} store
 * @param {number} store_value
 * @param {1 | -1} [d]
 * @returns {number}
 */
export function update_pre_store(store, store_value, d = 1) {
	const value = store_value + d;
	store.set(value);
	return value;
}
