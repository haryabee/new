/** @import { ArrowFunctionExpression, FunctionDeclaration, FunctionExpression } from 'estree' */
/** @import { Context } from '../../types' */

/**
 * @param {ArrowFunctionExpression | FunctionExpression | FunctionDeclaration} node
 * @param {Context} context
 */
export function visit_function(node, context) {
	// TODO retire this in favour of a more general solution based on bindings
	node.metadata = {
		// module context -> already hoisted
		hoistable: context.state.ast_type === 'module' ? 'impossible' : false,
		hoistable_params: [],
		scope: context.state.scope
	};

	context.next({
		...context.state,
		function_depth: context.state.function_depth + 1
	});
}
