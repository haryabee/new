/** @import { RenderTag } from '#compiler' */
/** @import { Context } from '../types' */
import { unwrap_optional } from '../../../utils/ast.js';
import * as e from '../../../errors.js';
import { validate_opening_tag } from './shared/utils.js';

/**
 * @param {RenderTag} node
 * @param {Context} context
 */
export function RenderTag(node, context) {
	validate_opening_tag(node, context.state, '@');

	const callee = unwrap_optional(node.expression).callee;

	node.metadata.dynamic =
		callee.type !== 'Identifier' || context.state.scope.get(callee.name)?.kind !== 'normal';

	context.state.analysis.uses_render_tags = true;

	const raw_args = unwrap_optional(node.expression).arguments;
	for (const arg of raw_args) {
		if (arg.type === 'SpreadElement') {
			e.render_tag_invalid_spread_argument(arg);
		}
	}

	if (
		callee.type === 'MemberExpression' &&
		callee.property.type === 'Identifier' &&
		['bind', 'apply', 'call'].includes(callee.property.name)
	) {
		e.render_tag_invalid_call_expression(node);
	}

	context.next();
}
