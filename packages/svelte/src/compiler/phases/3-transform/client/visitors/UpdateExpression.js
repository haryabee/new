/** @import { Expression, Pattern, Statement, UpdateExpression } from 'estree' */
/** @import { Context } from '../types' */
import { is_ignored } from '../../../../state.js';
import * as b from '../../../../utils/builders.js';
import { build_getter, build_setter } from '../utils.js';

/**
 * @param {UpdateExpression} node
 * @param {Context} context
 */
export function UpdateExpression(node, context) {
	const argument = node.argument;
	const transformers = context.state.transformers;

	if (argument.type === 'Identifier') {
		if (Object.hasOwn(transformers, argument.name) && transformers[argument.name].update) {
			const transformer = transformers[argument.name].update;
			if (transformer) return transformer(node);
		}

		return context.next();
	}

	if (
		argument.type === 'MemberExpression' &&
		argument.object.type === 'ThisExpression' &&
		argument.property.type === 'PrivateIdentifier' &&
		context.state.private_state.has(argument.property.name)
	) {
		let fn = '$.update';
		if (node.prefix) fn += '_pre';

		/** @type {Expression[]} */
		const args = [argument];
		if (node.operator === '--') {
			args.push(b.literal(-1));
		}

		return b.call(fn, ...args);
	}

	/** @param {any} serialized */
	function maybe_skip_ownership_validation(serialized) {
		if (is_ignored(node, 'ownership_invalid_mutation')) {
			return b.call('$.skip_ownership_validation', b.thunk(serialized));
		}

		return serialized;
	}

	// turn it into an IIFE assignment expression: i++ -> (() => { const $$value = i; i+=1; return $$value; })
	const assignment = b.assignment(
		node.operator === '++' ? '+=' : '-=',
		/** @type {Pattern} */ (argument),
		b.literal(1)
	);

	const serialized_assignment = build_setter(assignment, context, () => assignment, node.prefix);

	const value = /** @type {Expression} */ (context.visit(argument));

	if (serialized_assignment === assignment) {
		// No change to output -> nothing to transform -> we can keep the original update expression
		return maybe_skip_ownership_validation(context.next());
	}

	if (context.state.analysis.runes) {
		return maybe_skip_ownership_validation(serialized_assignment);
	}

	/** @type {Statement[]} */
	let statements;
	if (node.prefix) {
		statements = [b.stmt(serialized_assignment), b.return(value)];
	} else {
		const tmp_id = context.state.scope.generate('$$value');
		statements = [b.const(tmp_id, value), b.stmt(serialized_assignment), b.return(b.id(tmp_id))];
	}

	return maybe_skip_ownership_validation(b.call(b.thunk(b.block(statements))));
}
