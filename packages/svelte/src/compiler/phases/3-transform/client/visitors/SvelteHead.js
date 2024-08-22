/** @import { BlockStatement } from 'estree' */
/** @import { Ast } from '#compiler' */
/** @import { ComponentContext } from '../types' */
import * as b from '../../../../utils/builders.js';

/**
 * @param {Ast.SvelteHead} node
 * @param {ComponentContext} context
 */
export function SvelteHead(node, context) {
	// TODO attributes?
	context.state.init.push(
		b.stmt(
			b.call(
				'$.head',
				b.arrow([b.id('$$anchor')], /** @type {BlockStatement} */ (context.visit(node.fragment)))
			)
		)
	);
}
