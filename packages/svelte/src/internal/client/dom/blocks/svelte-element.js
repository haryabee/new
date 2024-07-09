/** @import { Effect, TemplateNode } from '#client' */
import { namespace_svg } from '../../../../constants.js';
import {
	hydrate_next,
	hydrate_node,
	hydrating,
	set_hydrate_node,
	set_hydrating
} from '../hydration.js';
import { empty } from '../operations.js';
import {
	block,
	branch,
	destroy_effect,
	pause_effect,
	resume_effect
} from '../../reactivity/effects.js';
import { set_should_intro } from '../../render.js';
import { current_each_item, set_current_each_item } from './each.js';
import { current_component_context, current_effect } from '../../runtime.js';
import { DEV } from 'esm-env';
import { EFFECT_TRANSPARENT } from '../../constants.js';

/**
 * @param {Comment | Element} node
 * @param {() => string} get_tag
 * @param {boolean} is_svg
 * @param {undefined | ((element: Element, anchor: Node | null) => void)} render_fn,
 * @param {undefined | (() => string)} get_namespace
 * @param {undefined | [number, number]} location
 * @returns {void}
 */
export function element(node, get_tag, is_svg, render_fn, get_namespace, location) {
	let was_hydrating = hydrating;

	if (hydrating) {
		hydrate_next();
	}

	const filename = DEV && location && current_component_context?.function.filename;

	/** @type {string | null} */
	let tag;

	/** @type {string | null} */
	let current_tag;

	/** @type {null | Element} */
	let element = null;

	if (hydrating && hydrate_node.nodeType === 1) {
		element = /** @type {Element} */ (hydrate_node);
		hydrate_next();
	}

	let anchor = /** @type {TemplateNode} */ (hydrating ? hydrate_node : node);

	/** @type {Effect | null} */
	let effect;

	/**
	 * The keyed `{#each ...}` item block, if any, that this element is inside.
	 * We track this so we can set it when changing the element, allowing any
	 * `animate:` directive to bind itself to the correct block
	 */
	let each_item_block = current_each_item;

	block(() => {
		const next_tag = get_tag() || null;
		const ns = get_namespace
			? get_namespace()
			: is_svg || next_tag === 'svg'
				? namespace_svg
				: null;

		// Assumption: Noone changes the namespace but not the tag (what would that even mean?)
		if (next_tag === tag) return;

		// See explanation of `each_item_block` above
		var previous_each_item = current_each_item;
		set_current_each_item(each_item_block);

		if (effect) {
			if (next_tag === null) {
				// start outro
				pause_effect(effect, () => {
					effect = null;
					current_tag = null;
				});
			} else if (next_tag === current_tag) {
				// same tag as is currently rendered — abort outro
				resume_effect(effect);
			} else {
				// tag is changing — destroy immediately, render contents without intro transitions
				destroy_effect(effect);
				set_should_intro(false);
			}
		}

		if (next_tag && next_tag !== current_tag) {
			effect = branch(() => {
				element = hydrating
					? /** @type {Element} */ (element)
					: ns
						? document.createElementNS(ns, next_tag)
						: document.createElement(next_tag);

				if (DEV && location) {
					// @ts-expect-error
					element.__svelte_meta = {
						loc: {
							file: filename,
							line: location[0],
							column: location[1]
						}
					};
				}

				if (render_fn) {
					// If hydrating, use the existing ssr comment as the anchor so that the
					// inner open and close methods can pick up the existing nodes correctly
					var child_anchor = /** @type {TemplateNode} */ (
						hydrating ? element.firstChild : element.appendChild(empty())
					);

					if (hydrating) {
						if (child_anchor === null) {
							set_hydrating(false);
						} else {
							set_hydrate_node(child_anchor);
						}
					}

					// `child_anchor` is undefined if this is a void element, but we still
					// need to call `render_fn` in order to run actions etc. If the element
					// contains children, it's a user error (which is warned on elsewhere)
					// and the DOM will be silently discarded
					render_fn(element, child_anchor);
				}

				// we do this after calling `render_fn` so that child effects don't override `nodes`
				/** @type {Effect} */ (current_effect).nodes = { start: element, end: element };

				anchor.before(element);
			});
		}

		tag = next_tag;
		if (tag) current_tag = tag;
		set_should_intro(true);

		set_current_each_item(previous_each_item);
	}, EFFECT_TRANSPARENT);

	if (was_hydrating) {
		set_hydrating(true);
		set_hydrate_node(anchor);
	}
}
