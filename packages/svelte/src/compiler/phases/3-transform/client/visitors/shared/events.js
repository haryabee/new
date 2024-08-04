/** @import { Expression } from 'estree' */
/** @import { Attribute, ExpressionMetadata, ExpressionTag, OnDirective, SvelteNode } from '#compiler' */
/** @import { ComponentContext } from '../../types' */
import { is_capture_event, is_passive_event } from '../../../../../../utils.js';
import * as b from '../../../../../utils/builders.js';

/**
 * @param {Attribute} node
 * @param {ComponentContext} context
 */
export function build_event_attribute(node, context) {
	let capture = false;

	let event_name = node.name.slice(2);
	if (is_capture_event(event_name)) {
		event_name = event_name.slice(0, -7);
		capture = true;
	}

	// we still need to support the weird `onclick="{() => {...}}" form
	const tag = Array.isArray(node.value)
		? /** @type {ExpressionTag} */ (node.value[0])
		: /** @type {ExpressionTag} */ (node.value);

	let handler = build_event_handler(tag.expression, tag.metadata.expression, context);

	if (node.metadata.delegated) {
		let delegated_assignment;

		if (!context.state.events.has(event_name)) {
			context.state.events.add(event_name);
		}

		// Hoist function if we can, otherwise we leave the function as is
		if (node.metadata.delegated.hoistable) {
			if (node.metadata.delegated.function === tag.expression) {
				const func_name = context.state.scope.root.unique('on_' + event_name);
				context.state.hoisted.push(b.var(func_name, handler));
				handler = func_name;
			}

			const hoistable_params = /** @type {Expression[]} */ (
				node.metadata.delegated.function.metadata.hoistable_params
			);
			// When we hoist a function we assign an array with the function and all
			// hoisted closure params.
			const args = [handler, ...hoistable_params];
			delegated_assignment = b.array(args);
		} else {
			delegated_assignment = handler;
		}

		context.state.init.push(
			b.stmt(
				b.assignment(
					'=',
					b.member(context.state.node, b.id('__' + event_name)),
					delegated_assignment
				)
			)
		);
	} else {
		const statement = b.stmt(build_event(event_name, handler, capture, undefined, context));
		const type = /** @type {SvelteNode} */ (context.path.at(-1)).type;

		if (type === 'SvelteDocument' || type === 'SvelteWindow' || type === 'SvelteBody') {
			// These nodes are above the component tree, and its events should run parent first
			context.state.init.push(statement);
		} else {
			context.state.after_update.push(statement);
		}
	}
}

/**
 * Serializes an event handler function of the `on:` directive or an attribute starting with `on`
 * @param {string} event_name
 * @param {Expression} handler
 * @param {boolean} capture
 * @param {boolean | undefined} passive
 * @param {ComponentContext} context
 */
export function build_event(event_name, handler, capture, passive, context) {
	return b.call(
		'$.event',
		b.literal(event_name),
		context.state.node,
		handler,
		capture && b.true,
		passive === undefined ? undefined : b.literal(passive)
	);
}

/**
 * Serializes the event handler function of the `on:` directive
 * @param {Expression | null} node
 * @param {ExpressionMetadata} metadata
 * @param {ComponentContext} context
 * @returns {Expression}
 */
export function build_event_handler(node, metadata, context) {
	if (node === null) {
		// bubble event
		return b.function(
			null,
			[b.id('$$arg')],
			b.block([b.stmt(b.call('$.bubble_event.call', b.this, b.id('$$props'), b.id('$$arg')))])
		);
	}

	if (node.type === 'Identifier') {
		// common case — function declared in the script
		const binding = context.state.scope.get(node.name);
		if (!binding || (binding.kind === 'normal' && binding.declaration_kind !== 'import')) {
			return node;
		}
	}

	let handler = /** @type {Expression} */ (context.visit(node));

	if (
		metadata.has_call &&
		!(
			(node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
			node.metadata.hoistable
		)
	) {
		// Create a derived dynamic event handler
		const id = b.id(context.state.scope.generate('event_handler'));

		context.state.init.push(b.var(id, b.call('$.derived', b.thunk(handler))));

		handler = b.call('$.get', id);
	}

	return b.function(
		null,
		[b.rest(b.id('$$args'))],
		b.block([b.stmt(b.call(b.member(handler, b.id('apply'), false, true), b.this, b.id('$$args')))])
	);
}
