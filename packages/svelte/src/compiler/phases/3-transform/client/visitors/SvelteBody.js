/** @import { Ast } from '#compiler' */
/** @import { ComponentContext } from '../types' */
import { visit_special_element } from './shared/special_element.js';

/**
 * @param {Ast.SvelteBody} node
 * @param {ComponentContext} context
 */
export function SvelteBody(node, context) {
	visit_special_element(node, '$.document.body', context);
}
