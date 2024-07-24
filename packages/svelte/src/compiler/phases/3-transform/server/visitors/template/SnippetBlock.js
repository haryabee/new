/** @import { BlockStatement } from 'estree' */
/** @import { SnippetBlock } from '#compiler' */
/** @import { ComponentContext } from '../../types' */
import * as b from '../../../../../utils/builders.js';

/**
 * @param {SnippetBlock} node
 * @param {ComponentContext} context
 */
export function SnippetBlock(node, context) {
	const fn = b.function_declaration(
		node.expression,
		[b.id('$$payload'), ...node.parameters],
		/** @type {BlockStatement} */ (context.visit(node.body))
	);

	// @ts-expect-error - TODO remove this hack once $$render_inner for legacy bindings is gone
	fn.___snippet = true;

	// TODO hoist where possible
	context.state.init.push(fn);
}
