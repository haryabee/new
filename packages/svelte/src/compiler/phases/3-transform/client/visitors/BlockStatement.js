/** @import { BlockStatement, Expression, Statement } from 'estree' */
/** @import { ComponentContext } from '../types' */
import { add_state_transformers } from './shared/declarations.js';
import * as b from '../../../../utils/builders.js';

/**
 * @param {BlockStatement} node
 * @param {ComponentContext} context
 */
export function BlockStatement(node, context) {
	add_state_transformers(context);
	const tracing = context.state.scope.tracing;

	if (tracing !== null) {
		return b.block([
			b.return(
				b.call(
					'$.trace',
					/** @type {Expression} */ (context.visit(tracing)),
					b.thunk(b.block(node.body.map((n) => /** @type {Statement} */ (context.visit(n)))))
				)
			)
		]);
	}

	context.next();
}
