/** @import { AssignmentExpression, BinaryOperator, Expression, Node, Pattern } from 'estree' */
/** @import { SvelteNode } from '#compiler' */
/** @import { Context, ServerTransformState } from '../types.js' */
import { extract_paths } from '../../../../utils/ast.js';
import * as b from '../../../../utils/builders.js';
import { serialize_get_binding } from './shared/utils.js';

/**
 * @param {AssignmentExpression} node
 * @param {Context} context
 */
export function AssignmentExpression(node, context) {
	const parent = /** @type {Node} */ (context.path.at(-1));
	const is_standalone = parent.type.endsWith('Statement');
	return serialize_assignment(node, context, is_standalone, context.next);
}

/**
 * @param {AssignmentExpression} node
 * @param {import('zimmerframe').Context<SvelteNode, ServerTransformState>} context
 * @param {boolean} is_standalone
 * @param {() => any} fallback
 * @returns {Expression}
 */
function serialize_assignment(node, context, is_standalone, fallback) {
	if (
		node.left.type === 'ArrayPattern' ||
		node.left.type === 'ObjectPattern' ||
		node.left.type === 'RestElement'
	) {
		const value = /** @type {Expression} */ (context.visit(node.right));

		const should_cache = value.type !== 'Identifier';
		const rhs = should_cache ? b.id('$$value') : value;

		/** @type {Expression[]} */
		const assignments = [];
		let should_transform = false;

		for (const path of extract_paths(node.left)) {
			const assignment = b.assignment('=', path.node, path.expression?.(rhs));
			let changed = true;

			assignments.push(
				serialize_assignment(assignment, context, false, () => {
					changed = false;
					return assignment;
				})
			);

			should_transform ||= changed;
		}

		if (!should_transform) {
			// No change to output -> nothing to transform -> we can keep the original assignment
			return fallback();
		}

		const sequence = b.sequence(assignments);

		if (!is_standalone) {
			// this is part of an expression, we need the sequence to end with the value
			sequence.expressions.push(rhs);
		}

		if (should_cache) {
			return b.call(b.arrow([rhs], sequence), value);
		}

		return sequence;
	}

	if (node.left.type !== 'Identifier' && node.left.type !== 'MemberExpression') {
		throw new Error(`Unexpected assignment type ${node.left.type}`);
	}

	let left = node.left;

	while (left.type === 'MemberExpression') {
		// @ts-expect-error
		left = left.object;
	}

	if (left.type !== 'Identifier' || !is_store_name(left.name)) {
		return fallback();
	}

	const name = left.name.slice(1);

	if (!context.state.scope.get(name)) {
		// TODO error if it's a computed (or rest prop)? or does that already happen elsewhere?
		return fallback();
	}

	if (left === node.left) {
		return b.call('$.store_set', b.id(name), /** @type {Expression} */ (context.visit(node.right)));
	}

	return b.call(
		'$.mutate_store',
		b.assignment('??=', b.id('$$store_subs'), b.object([])),
		b.literal(left.name),
		b.id(name),
		b.assignment(
			node.operator,
			/** @type {Pattern} */ (context.visit(node.left)),
			get_assignment_value(node, context)
		)
	);
}

/**
 * @param {AssignmentExpression} node
 * @param {Pick<import('zimmerframe').Context<SvelteNode, ServerTransformState>, 'visit' | 'state'>} context
 */
function get_assignment_value(node, { state, visit }) {
	if (node.left.type === 'Identifier') {
		const operator = node.operator;
		return operator === '='
			? /** @type {Expression} */ (visit(node.right))
			: // turn something like x += 1 into x = x + 1
				b.binary(
					/** @type {BinaryOperator} */ (operator.slice(0, -1)),
					serialize_get_binding(node.left, state),
					/** @type {Expression} */ (visit(node.right))
				);
	}

	return /** @type {Expression} */ (visit(node.right));
}

/**
 * @param {string} name
 */
function is_store_name(name) {
	return name[0] === '$' && /[A-Za-z_]/.test(name[1]);
}
