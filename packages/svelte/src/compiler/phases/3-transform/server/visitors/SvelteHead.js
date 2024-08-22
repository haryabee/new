/** @import { BlockStatement } from 'estree' */
/** @import { Ast } from '#compiler' */
/** @import { ComponentContext } from '../types.js' */
import * as b from '../../../../utils/builders.js';

/**
 * @param {Ast.SvelteHead} node
 * @param {ComponentContext} context
 */
export function SvelteHead(node, context) {
	const block = /** @type {BlockStatement} */ (context.visit(node.fragment));

	context.state.template.push(
		b.stmt(b.call('$.head', b.id('$$payload'), b.arrow([b.id('$$payload')], block)))
	);
}
