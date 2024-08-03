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

	if (node.metadata.delegated) {
		let handler = build_event_handler([], tag.expression, tag.metadata.expression, context);

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
		const handler = build_event(
			event_name,
			capture ? ['capture'] : [], // TODO
			tag.expression,
			tag.metadata.expression,
			context
		);

		// TODO this is duplicated with OnDirective
		const parent = /** @type {SvelteNode} */ (context.path.at(-1));
		const has_action_directive =
			parent.type === 'RegularElement' && parent.attributes.find((a) => a.type === 'UseDirective');
		const statement = b.stmt(has_action_directive ? b.call('$.effect', b.thunk(handler)) : handler);

		// TODO put this logic in the parent visitor?
		if (
			parent.type === 'SvelteDocument' ||
			parent.type === 'SvelteWindow' ||
			parent.type === 'SvelteBody'
		) {
			// These nodes are above the component tree, and its events should run parent first
			context.state.before_init.push(statement);
		} else {
			context.state.after_update.push(statement);
		}
	}
}

/**
 * Serializes an event handler function of the `on:` directive or an attribute starting with `on`
 * @param {string} event_name
 * @param {string[]} modifiers
 * @param {Expression | null} expression
 * @param {null | ExpressionMetadata} metadata
 * @param {ComponentContext} context
 */
export function build_event(event_name, modifiers, expression, metadata, context) {
	let handler = build_event_handler(modifiers, expression, metadata, context);

	const args = [
		b.literal(event_name),
		context.state.node,
		handler,
		b.literal(modifiers.includes('capture'))
	];

	if (modifiers.includes('passive')) {
		args.push(b.literal(true));
	} else if (modifiers.includes('nonpassive')) {
		args.push(b.literal(false));
	} else if (
		is_passive_event(event_name) &&
		/** @type {OnDirective} */ (node).type !== 'OnDirective'
	) {
		// For on:something events we don't apply passive behaviour to match Svelte 4.
		args.push(b.literal(true));
	}

	// Events need to run in order with bindings/actions
	return b.call('$.event', ...args);
}

/**
 * Serializes the event handler function of the `on:` directive
 * @param {string[]} modifiers
 * @param {Expression | null} expression
 * @param {null | ExpressionMetadata} metadata
 * @param {ComponentContext} context
 */
export function build_event_handler(modifiers, expression, metadata, context) {
	/** @type {Expression} */
	let handler;

	if (expression) {
		handler = expression;

		// Event handlers can be dynamic (source/store/prop/conditional etc)
		const dynamic_handler = () =>
			b.function(
				null,
				[b.rest(b.id('$$args'))],
				b.block([
					b.return(
						b.call(
							b.member(
								/** @type {Expression} */ (context.visit(handler)),
								b.id('apply'),
								false,
								true
							),
							b.this,
							b.id('$$args')
						)
					)
				])
			);

		if (
			metadata?.has_call &&
			!(
				(handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression') &&
				handler.metadata.hoistable
			)
		) {
			// Create a derived dynamic event handler
			const id = b.id(context.state.scope.generate('event_handler'));

			context.state.init.push(
				b.var(id, b.call('$.derived', b.thunk(/** @type {Expression} */ (context.visit(handler)))))
			);

			handler = b.function(
				null,
				[b.rest(b.id('$$args'))],
				b.block([
					b.return(
						b.call(
							b.member(b.call('$.get', id), b.id('apply'), false, true),
							b.this,
							b.id('$$args')
						)
					)
				])
			);
		} else if (handler.type === 'Identifier') {
			const binding = context.state.scope.get(handler.name);

			if (
				binding !== null &&
				(binding.kind !== 'normal' || binding.declaration_kind === 'import')
			) {
				handler = dynamic_handler();
			} else {
				handler = /** @type {Expression} */ (context.visit(handler));
			}
		} else {
			handler = dynamic_handler();
		}
	} else {
		context.state.analysis.needs_props = true;

		// Function + .call to preserve "this" context as much as possible
		handler = b.function(
			null,
			[b.id('$$arg')],
			b.block([b.stmt(b.call('$.bubble_event.call', b.this, b.id('$$props'), b.id('$$arg')))])
		);
	}

	if (modifiers.includes('stopPropagation')) {
		handler = b.call('$.stopPropagation', handler);
	}
	if (modifiers.includes('stopImmediatePropagation')) {
		handler = b.call('$.stopImmediatePropagation', handler);
	}
	if (modifiers.includes('preventDefault')) {
		handler = b.call('$.preventDefault', handler);
	}
	if (modifiers.includes('self')) {
		handler = b.call('$.self', handler);
	}
	if (modifiers.includes('trusted')) {
		handler = b.call('$.trusted', handler);
	}
	if (modifiers.includes('once')) {
		handler = b.call('$.once', handler);
	}

	return handler;
}
