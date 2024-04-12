import { block, branch, destroy_effect } from '../reactivity/effects.js';
import { set_should_intro } from '../render.js';
import { get } from '../runtime.js';

/**
 * @template {(anchor: Comment, props: any) => any} Component
 * @param {import("#client").Source<Component>} source
 */
export function hmr(source) {
	/**
	 * @param {Comment} anchor
	 * @param {any} props
	 */
	return (anchor, props) => {
		let instance = {};

		/** @type {import("#client").Effect} */
		let effect;

		block(() => {
			const component = get(source);
			if (!component) {
				debugger
			}

			if (effect) {
				// @ts-ignore
				for (var k in instance) delete instance[k];
				destroy_effect(effect);
			}

			effect = branch(() => {
				set_should_intro(false);
				Object.assign(instance, component(anchor, props));
				set_should_intro(true);
			});
		});

		return instance;
	};
}
