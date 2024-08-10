/** @import { TemplateNode } from '#client' */

import {
	HYDRATION_END,
	HYDRATION_ERROR,
	HYDRATION_START,
	HYDRATION_START_ELSE
} from '../../../constants.js';
import * as w from '../warnings.js';

/**
 * Use this variable to guard everything related to hydration code so it can be treeshaken out
 * if the user doesn't use the `hydrate` method and these code paths are therefore not needed.
 */
export let hydrating = false;

/** @param {boolean} value */
export function set_hydrating(value) {
	hydrating = value;
}

/**
 * The node that is currently being hydrated. This starts out as the first node inside the opening
 * <!--[--> comment, and updates each time a component calls `$.child(...)` or `$.sibling(...)`.
 * When entering a block (e.g. `{#if ...}`), `hydrate_node` is the block opening comment; by the
 * time we leave the block it is the closing comment, which serves as the block's anchor.
 * @type {TemplateNode}
 */
export let hydrate_node;

/** @param {TemplateNode} node */
export function set_hydrate_node(node) {
	if (node === null) {
		w.hydration_mismatch();
		throw HYDRATION_ERROR;
	}

	return (hydrate_node = node);
}

export function hydrate_next() {
	return set_hydrate_node(/** @type {TemplateNode} */ (hydrate_node.nextSibling));
}

/** @param {TemplateNode} node */
export function reset(node) {
	if (!hydrating) return;

	// If we are resetting back to a parent, then we should be at the end of the current parent
	// and thus have no more siblings to hydrate (except if we're inside a template).
	if (hydrate_node.nextSibling !== null && hydrate_node.nodeName !== 'TEMPLATE') {
		w.hydration_mismatch();
		throw HYDRATION_ERROR;
	}

	hydrate_node = node;
}

export function next() {
	if (hydrating) {
		hydrate_next();
	}
}

/**
 * Removes all nodes starting at `hydrate_node` up until the next hydration end comment
 */
export function remove_nodes() {
	var depth = 0;
	var node = hydrate_node;

	while (true) {
		if (node.nodeType === 8) {
			var data = /** @type {Comment} */ (node).data;

			if (data === HYDRATION_END) {
				if (depth === 0) return node;
				depth -= 1;
			} else if (data === HYDRATION_START || data === HYDRATION_START_ELSE) {
				depth += 1;
			}
		}

		var next = /** @type {TemplateNode} */ (node.nextSibling);
		node.remove();
		node = next;
	}
}
