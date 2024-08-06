/** @import { ArrowFunctionExpression, FunctionExpression, Node } from 'estree' */
/** @import { ComponentContext } from '../../types' */
import { build_hoistable_params } from '../../utils.js';

/**
 * @param {ArrowFunctionExpression | FunctionExpression} node
 * @param {ComponentContext} context
 */
export const visit_function = (node, context) => {
	const metadata = node.metadata;

	let state = context.state;

	if (node.type === 'FunctionExpression') {
		const parent = /** @type {Node} */ (context.path.at(-1));
		const in_constructor = parent.type === 'MethodDefinition' && parent.kind === 'constructor';

		state = { ...context.state, in_constructor };
	} else {
		state = { ...context.state, in_constructor: false };
	}

	if (metadata?.hoistable === true) {
		const params = build_hoistable_params(node, context);

		return /** @type {FunctionExpression} */ ({
			...node,
			params,
			body: context.visit(node.body, state)
		});
	}

	context.next(state);
};
