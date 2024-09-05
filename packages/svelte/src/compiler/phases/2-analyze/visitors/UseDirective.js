/** @import { AST } from '#compiler' */
/** @import { Context } from '../types' */
import { mark_subtree_dynamic } from './shared/fragment.js';
import * as w from '../../../warnings.js';

/**
 * @param {AST.UseDirective} node
 * @param {Context} context
 */
export function UseDirective(node, context) {
	if (!context.state.scope.get(node.name)) {
		w.directive_not_defined(node, node.name);
	}
	mark_subtree_dynamic(context.path);
	context.next();
}
