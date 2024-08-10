/** @import { AssignmentExpression, AssignmentOperator, BinaryOperator, Expression, Node, Pattern } from 'estree' */
/** @import { SvelteNode } from '#compiler' */
/** @import { ClientTransformState, Context } from '../types.js' */
import * as b from '../../../../utils/builders.js';
import {
	build_assignment_value,
	extract_paths,
	is_expression_async
} from '../../../../utils/ast.js';
import { is_ignored } from '../../../../state.js';
import { build_proxy_reassignment, should_proxy_or_freeze } from '../utils.js';

/**
 * @param {AssignmentExpression} node
 * @param {Context} context
 */
export function AssignmentExpression(node, context) {
	if (
		node.left.type === 'ArrayPattern' ||
		node.left.type === 'ObjectPattern' ||
		node.left.type === 'RestElement'
	) {
		const value = /** @type {Expression} */ (context.visit(node.right));
		const should_cache = value.type !== 'Identifier';
		const rhs = should_cache ? b.id('$$value') : value;

		let changed = false;

		const assignments = extract_paths(node.left).map((path) => {
			const value = path.expression?.(rhs);

			let assignment = build_assignment('=', path.node, value, context);
			if (assignment !== null) changed = true;

			return assignment ?? /** @type {Expression} */ (context.next());
		});

		if (!changed) {
			// No change to output -> nothing to transform -> we can keep the original assignment
			return context.next();
		}

		const is_standalone = /** @type {Node} */ (context.path.at(-1)).type.endsWith('Statement');
		const sequence = b.sequence(assignments);

		if (!is_standalone) {
			// this is part of an expression, we need the sequence to end with the value
			sequence.expressions.push(rhs);
		}

		if (should_cache) {
			// the right hand side is a complex expression, wrap in an IIFE to cache it
			const iife = b.arrow([rhs], sequence);

			const iife_is_async =
				is_expression_async(value) ||
				assignments.some((assignment) => is_expression_async(assignment));

			return iife_is_async ? b.await(b.call(b.async(iife), value)) : b.call(iife, value);
		}

		return sequence;
	}

	if (node.left.type !== 'Identifier' && node.left.type !== 'MemberExpression') {
		throw new Error(`Unexpected assignment type ${node.left.type}`);
	}

	return (
		build_assignment(node.operator, node.left, node.right, context) ??
		/** @type {Expression} */ (context.next())
	);
}

/**
 * @template {ClientTransformState} State
 * @param {AssignmentOperator} operator
 * @param {Pattern} left
 * @param {Expression} right
 * @param {import('zimmerframe').Context<SvelteNode, State>} context
 * @returns {Expression | null}
 */
export function build_assignment(operator, left, right, context) {
	// Handle class private/public state assignment cases
	if (
		context.state.analysis.runes &&
		left.type === 'MemberExpression' &&
		left.object.type === 'ThisExpression'
	) {
		if (left.property.type === 'PrivateIdentifier') {
			const private_state = context.state.private_state.get(left.property.name);

			if (private_state !== undefined) {
				let value = /** @type {Expression} */ (
					context.visit(build_assignment_value(operator, left, right))
				);
				let transformed = false;

				if (should_proxy_or_freeze(value, context.state.scope)) {
					transformed = true;
					value =
						private_state.kind === 'frozen_state'
							? b.call('$.freeze', value)
							: build_proxy_reassignment(value, private_state.id);
				}

				if (context.state.in_constructor) {
					if (transformed) {
						return b.assignment(operator, /** @type {Pattern} */ (context.visit(left)), value);
					}
				} else {
					return b.call('$.set', left, value);
				}
			}
		} else if (left.property.type === 'Identifier' && context.state.in_constructor) {
			const public_state = context.state.public_state.get(left.property.name);

			if (public_state !== undefined && should_proxy_or_freeze(right, context.state.scope)) {
				const value = /** @type {Expression} */ (context.visit(right));

				return b.assignment(
					operator,
					/** @type {Pattern} */ (context.visit(left)),
					public_state.kind === 'frozen_state'
						? b.call('$.freeze', value)
						: build_proxy_reassignment(value, public_state.id)
				);
			}
		}
	}

	let object = left;

	while (object.type === 'MemberExpression') {
		// @ts-expect-error
		object = object.object;
	}

	if (object.type !== 'Identifier') {
		return null;
	}

	const binding = context.state.scope.get(object.name);
	if (!binding) return null;

	const transform = Object.hasOwn(context.state.transform, object.name)
		? context.state.transform[object.name]
		: null;

	// reassignment
	if (object === left && transform?.assign) {
		let value = /** @type {Expression} */ (
			context.visit(build_assignment_value(operator, left, right))
		);

		// special case — if an element binding, we know it's a primitive
		const path = context.path.map((node) => node.type);
		const is_primitive = path.at(-1) === 'BindDirective' && path.at(-2) === 'RegularElement';

		if (
			!is_primitive &&
			binding.kind !== 'prop' &&
			context.state.analysis.runes &&
			should_proxy_or_freeze(value, context.state.scope)
		) {
			value =
				binding.kind === 'frozen_state'
					? b.call('$.freeze', value)
					: build_proxy_reassignment(value, object.name);
		}

		return transform.assign(object, value);
	}

	/** @type {Expression} */
	let mutation = b.assignment(
		operator,
		/** @type {Pattern} */ (context.visit(left)),
		/** @type {Expression} */ (context.visit(right))
	);

	// mutation
	if (transform?.mutate) {
		mutation = transform.mutate(object, mutation);
	}

	return is_ignored(left, 'ownership_invalid_mutation')
		? b.call('$.skip_ownership_validation', b.thunk(mutation))
		: mutation;
}
