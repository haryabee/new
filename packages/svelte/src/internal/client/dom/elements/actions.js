import { effect, render_effect } from '../../reactivity/effects.js';
import { deep_read_state, untrack } from '../../runtime.js';
import { hydrating } from '../hydration.js';
import { hydrate_event_replay } from './events.js';

/**
 * @template P
 * @param {Element} dom
 * @param {(dom: Element, value?: P) => import('#client').ActionPayload<P>} action
 * @param {() => P} [get_value]
 * @returns {void}
 */
export function action(dom, action, get_value) {
	effect(() => {
		var payload = untrack(() => action(dom, get_value?.()) || {});

		if (get_value && payload?.update) {
			var inited = false;

			render_effect(() => {
				var value = get_value();

				// Action's update method is coarse-grained, i.e. when anything in the passed value changes, update.
				// This works in legacy mode because of mutable_source being updated as a whole, but when using $state
				// together with actions and mutation, it wouldn't notice the change without a deep read.
				deep_read_state(value);

				if (inited) {
					/** @type {Function} */ (payload.update)(value);
				}
			});

			inited = true;
			if (hydrating) {
				hydrate_event_replay(/** @type {HTMLElement} */ (dom));
			}
		}

		if (payload?.destroy) {
			return () => /** @type {Function} */ (payload.destroy)();
		}
	});
}
