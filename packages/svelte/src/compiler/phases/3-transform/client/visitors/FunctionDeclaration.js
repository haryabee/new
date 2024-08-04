/** @import { FunctionDeclaration } from 'estree' */
/** @import { ComponentContext } from '../types' */
import { build_hoistable_params } from '../utils.js';
import * as b from '../../../../utils/builders.js';

/**
 * @param {FunctionDeclaration} node
 * @param {ComponentContext} context
 */
export function FunctionDeclaration(node, context) {
	const state = { ...context.state, in_constructor: false };

	if (node.metadata?.hoistable === true) {
		const params = build_hoistable_params(node, context);
		const body = context.visit(node.body, state);

		context.state.hoisted.push(/** @type {FunctionDeclaration} */ ({ ...node, params, body }));

		return b.empty;
	}

	context.next(state);
}
