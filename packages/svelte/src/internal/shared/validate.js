/** @import { TemplateNode } from '#client' */
/** @import { Getters } from '#shared' */
import { is_void } from '../../constants.js';
import * as w from './warnings.js';
import * as e from './errors.js';

export function invalid_children_snippet() {
	e.invalid_default_snippet();
}

/**
 * Validate that the function behind `<Component />` isn't a snippet.
 * @param {any} component_fn
 */
export function validate_component(component_fn) {
	return component_fn; // TODO get rid
}

/**
 * @param {() => string} tag_fn
 * @returns {void}
 */
export function validate_void_dynamic_element(tag_fn) {
	const tag = tag_fn();
	if (tag && is_void(tag)) {
		w.dynamic_void_element_content(tag);
	}
}

/** @param {() => unknown} tag_fn */
export function validate_dynamic_element_tag(tag_fn) {
	const tag = tag_fn();
	const is_string = typeof tag === 'string';
	if (tag && !is_string) {
		e.svelte_element_invalid_this_value();
	}
}

/**
 * @param {any} store
 * @param {string} name
 */
export function validate_store(store, name) {
	if (store != null && typeof store.subscribe !== 'function') {
		e.store_invalid_shape(name);
	}
}
