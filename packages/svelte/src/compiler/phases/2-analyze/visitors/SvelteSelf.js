/** @import { Ast } from '#compiler' */
/** @import { Context } from '../types' */
import { visit_component } from './shared/component.js';

/**
 * @param {Ast.SvelteSelf} node
 * @param {Context} context
 */
export function SvelteSelf(node, context) {
	visit_component(node, context);
}
