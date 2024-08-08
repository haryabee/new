/** @import { Identifier } from 'estree' */
/** @import { ComponentContext, Context } from '../../types' */
import { is_state_source } from '../../utils.js';
import * as b from '../../../../../utils/builders.js';

/**
 * Turns `foo` into `$.get(foo)`
 * @param {Identifier} node
 */
export function get_value(node) {
	return b.call('$.get', node);
}

/**
 *
 * @param {Context | ComponentContext} context
 */
export function add_state_transformers(context) {
	for (const [name, binding] of context.state.scope.declarations) {
		if (
			is_state_source(binding, context.state) ||
			binding.kind === 'derived' ||
			binding.kind === 'legacy_reactive'
		) {
			context.state.transformers[name] = {
				read: get_value,
				update: (node) => {
					return b.call(
						node.prefix ? '$.update_pre' : '$.update',
						node.argument,
						node.operator === '--' && b.literal(-1)
					);
				}
			};
		}
	}
}
