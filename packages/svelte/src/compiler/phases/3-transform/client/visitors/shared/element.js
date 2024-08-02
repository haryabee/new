/** @import { Expression, Identifier } from 'estree' */
/** @import { Attribute, ClassDirective, DelegatedEvent, ExpressionMetadata, ExpressionTag, Namespace, OnDirective, RegularElement, StyleDirective, SvelteElement, SvelteNode } from '#compiler' */
/** @import { ComponentContext } from '../../types' */
import {
	is_capture_event,
	is_passive_event,
	normalize_attribute
} from '../../../../../../utils.js';
import { get_attribute_expression } from '../../../../../utils/ast.js';
import * as b from '../../../../../utils/builders.js';
import { build_getter } from '../../utils.js';
import { build_event_handler, build_template_literal, build_update } from './utils.js';

/**
 * Serializes each style directive into something like `$.set_style(element, style_property, value)`
 * and adds it either to init or update, depending on whether or not the value or the attributes are dynamic.
 * @param {StyleDirective[]} style_directives
 * @param {Identifier} element_id
 * @param {ComponentContext} context
 * @param {boolean} is_attributes_reactive
 * @param {boolean} force_check Should be `true` if we can't rely on our cached value, because for example there's also a `style` attribute
 */
export function build_style_directives(
	style_directives,
	element_id,
	context,
	is_attributes_reactive,
	force_check
) {
	const state = context.state;

	for (const directive of style_directives) {
		let value =
			directive.value === true
				? build_getter({ name: directive.name, type: 'Identifier' }, context.state)
				: build_attribute_value(directive.value, context).value;

		const update = b.stmt(
			b.call(
				'$.set_style',
				element_id,
				b.literal(directive.name),
				value,
				/** @type {Expression} */ (directive.modifiers.includes('important') ? b.true : undefined),
				force_check ? b.true : undefined
			)
		);

		const { has_state, has_call } = directive.metadata.expression;

		if (!is_attributes_reactive && has_call) {
			state.init.push(build_update(update));
		} else if (is_attributes_reactive || has_state || has_call) {
			state.update.push(update);
		} else {
			state.init.push(update);
		}
	}
}

/**
 * Serializes each class directive into something like `$.class_toogle(element, class_name, value)`
 * and adds it either to init or update, depending on whether or not the value or the attributes are dynamic.
 * @param {ClassDirective[]} class_directives
 * @param {Identifier} element_id
 * @param {ComponentContext} context
 * @param {boolean} is_attributes_reactive
 */
export function build_class_directives(
	class_directives,
	element_id,
	context,
	is_attributes_reactive
) {
	const state = context.state;
	for (const directive of class_directives) {
		const value = /** @type {Expression} */ (context.visit(directive.expression));
		const update = b.stmt(b.call('$.toggle_class', element_id, b.literal(directive.name), value));

		const { has_state, has_call } = directive.metadata.expression;

		if (!is_attributes_reactive && has_call) {
			state.init.push(build_update(update));
		} else if (is_attributes_reactive || has_state || has_call) {
			state.update.push(update);
		} else {
			state.init.push(update);
		}
	}
}

/**
 * @param {Attribute['value']} value
 * @param {ComponentContext} context
 */
export function build_attribute_value(value, context) {
	if (value === true) {
		return { has_state: false, has_call: false, value: b.literal(true) };
	}

	if (!Array.isArray(value) || value.length === 1) {
		const chunk = Array.isArray(value) ? value[0] : value;

		if (chunk.type === 'Text') {
			return { has_state: false, has_call: false, value: b.literal(chunk.data) };
		}

		return {
			has_state: chunk.metadata.expression.has_call,
			has_call: chunk.metadata.expression.has_call,
			value: /** @type {Expression} */ (context.visit(chunk.expression))
		};
	}

	return build_template_literal(value, context.visit, context.state);
}

/**
 * @param {RegularElement | SvelteElement} element
 * @param {Attribute} attribute
 * @param {{ state: { metadata: { namespace: Namespace }}}} context
 */
export function get_attribute_name(element, attribute, context) {
	if (
		!element.metadata.svg &&
		!element.metadata.mathml &&
		context.state.metadata.namespace !== 'foreign'
	) {
		return normalize_attribute(attribute.name);
	}

	return attribute.name;
}

/**
 * @param {Attribute} node
 * @param {ComponentContext} context
 */
export function build_event_attribute(node, context) {
	/** @type {string[]} */
	const modifiers = [];

	let event_name = node.name.slice(2);
	if (is_capture_event(event_name)) {
		event_name = event_name.slice(0, -7);
		modifiers.push('capture');
	}

	// we still need to support the weird `onclick="{() => {...}}" form
	const tag = Array.isArray(node.value)
		? /** @type {ExpressionTag} */ (node.value[0])
		: /** @type {ExpressionTag} */ (node.value);

	const handler = build_event(
		event_name,
		modifiers,
		tag.expression,
		node.metadata.delegated,
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

/**
 * Serializes an event handler function of the `on:` directive or an attribute starting with `on`
 * @param {string} event_name
 * @param {string[]} modifiers
 * @param {Expression | null} original_expression
 * @param {DelegatedEvent | null} delegated
 * @param {null | ExpressionMetadata} metadata
 * @param {ComponentContext} context
 */
export function build_event(
	event_name,
	modifiers,
	original_expression,
	delegated,
	metadata,
	context
) {
	let handler = build_event_handler(modifiers, original_expression, metadata, context);

	if (delegated !== null) {
		let delegated_assignment;

		if (!context.state.events.has(event_name)) {
			context.state.events.add(event_name);
		}

		// Hoist function if we can, otherwise we leave the function as is
		if (delegated.type === 'hoistable') {
			if (delegated.function === original_expression) {
				const func_name = context.state.scope.root.unique('on_' + event_name);
				context.state.hoisted.push(b.var(func_name, handler));
				handler = func_name;
			}
			if (modifiers.includes('once')) {
				handler = b.call('$.once', handler);
			}
			const hoistable_params = /** @type {Expression[]} */ (
				delegated.function.metadata.hoistable_params
			);
			// When we hoist a function we assign an array with the function and all
			// hoisted closure params.
			const args = [handler, ...hoistable_params];
			delegated_assignment = b.array(args);
		} else {
			if (modifiers.includes('once')) {
				handler = b.call('$.once', handler);
			}
			delegated_assignment = handler;
		}

		return b.assignment(
			'=',
			b.member(context.state.node, b.id('__' + event_name)),
			delegated_assignment
		);
	}

	if (modifiers.includes('once')) {
		handler = b.call('$.once', handler);
	}

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
