/** @import { BlockStatement, CallExpression, Expression, ExpressionStatement, Identifier, Literal, MemberExpression, ObjectExpression, Pattern, Property, Statement, Super, TemplateElement, TemplateLiteral } from 'estree' */
/** @import { Attribute, BindDirective, Binding, ClassDirective, Component, DelegatedEvent, EachBlock, ExpressionTag, Namespace, OnDirective, RegularElement, SpreadAttribute, StyleDirective, SvelteComponent, SvelteElement, SvelteNode, SvelteSelf, TemplateNode, Text } from '#compiler' */
/** @import { SourceLocation } from '#shared' */
/** @import { Scope } from '../../../scope.js' */
/** @import { ComponentClientTransformState, ComponentContext, ComponentVisitors } from '../types.js' */
import {
	extract_identifiers,
	extract_paths,
	get_attribute_chunks,
	get_attribute_expression,
	is_event_attribute,
	is_text_attribute,
	object,
	unwrap_optional
} from '../../../../utils/ast.js';
import { binding_properties } from '../../../bindings.js';
import { clean_nodes, determine_namespace_for_children, infer_namespace } from '../../utils.js';
import {
	DOMProperties,
	LoadErrorElements,
	PassiveEvents,
	VoidElements
} from '../../../constants.js';
import { is_custom_element_node, is_element_node } from '../../../nodes.js';
import * as b from '../../../../utils/builders.js';
import {
	with_loc,
	function_visitor,
	get_assignment_value,
	serialize_get_binding,
	serialize_set_binding,
	create_derived,
	create_derived_block_argument
} from '../utils.js';
import {
	AttributeAliases,
	DOMBooleanAttributes,
	EACH_INDEX_REACTIVE,
	EACH_IS_ANIMATED,
	EACH_IS_CONTROLLED,
	EACH_IS_STRICT_EQUALS,
	EACH_ITEM_REACTIVE,
	EACH_KEYED,
	is_capture_event,
	TEMPLATE_FRAGMENT,
	TEMPLATE_USE_IMPORT_NODE,
	TRANSITION_GLOBAL,
	TRANSITION_IN,
	TRANSITION_OUT
} from '../../../../../constants.js';
import { escape_html } from '../../../../../escaping.js';
import { regex_is_valid_identifier } from '../../../patterns.js';
import { javascript_visitors_runes } from './javascript-runes.js';
import { sanitize_template_string } from '../../../../utils/sanitize_template_string.js';
import { walk } from 'zimmerframe';
import { ignore_map, locator } from '../../../../state.js';
import is_reference from 'is-reference';

/**
 * @param {RegularElement | SvelteElement} element
 * @param {Attribute} attribute
 * @param {{ state: { metadata: { namespace: Namespace }}}} context
 */
function get_attribute_name(element, attribute, context) {
	let name = attribute.name;
	if (
		!element.metadata.svg &&
		!element.metadata.mathml &&
		context.state.metadata.namespace !== 'foreign'
	) {
		name = name.toLowerCase();
		if (name in AttributeAliases) {
			name = AttributeAliases[name];
		}
	}
	return name;
}

/**
 * Serializes each style directive into something like `$.set_style(element, style_property, value)`
 * and adds it either to init or update, depending on whether or not the value or the attributes are dynamic.
 * @param {StyleDirective[]} style_directives
 * @param {Identifier} element_id
 * @param {ComponentContext} context
 * @param {boolean} is_attributes_reactive
 */
function serialize_style_directives(style_directives, element_id, context, is_attributes_reactive) {
	const state = context.state;

	for (const directive of style_directives) {
		let value =
			directive.value === true
				? serialize_get_binding({ name: directive.name, type: 'Identifier' }, context.state)
				: serialize_attribute_value(directive.value, context)[1];

		const update = b.stmt(
			b.call(
				'$.set_style',
				element_id,
				b.literal(directive.name),
				value,
				/** @type {Expression} */ (directive.modifiers.includes('important') ? b.true : undefined)
			)
		);

		const contains_call_expression = get_attribute_chunks(directive.value).some(
			(v) => v.type === 'ExpressionTag' && v.metadata.contains_call_expression
		);

		if (!is_attributes_reactive && contains_call_expression) {
			state.init.push(serialize_update(update));
		} else if (is_attributes_reactive || directive.metadata.dynamic || contains_call_expression) {
			state.update.push(update);
		} else {
			state.init.push(update);
		}
	}
}

/**
 * For unfortunate legacy reasons, directive names can look like this `use:a.b-c`
 * This turns that string into a member expression
 * @param {string} name
 */
function parse_directive_name(name) {
	// this allow for accessing members of an object
	const parts = name.split('.');
	let part = /** @type {string} */ (parts.shift());

	/** @type {Identifier | MemberExpression} */
	let expression = b.id(part);

	while ((part = /** @type {string} */ (parts.shift()))) {
		const computed = !regex_is_valid_identifier.test(part);
		expression = b.member(expression, computed ? b.literal(part) : b.id(part), computed);
	}

	return expression;
}

/**
 * Serializes each class directive into something like `$.class_toogle(element, class_name, value)`
 * and adds it either to init or update, depending on whether or not the value or the attributes are dynamic.
 * @param {ClassDirective[]} class_directives
 * @param {Identifier} element_id
 * @param {ComponentContext} context
 * @param {boolean} is_attributes_reactive
 */
function serialize_class_directives(class_directives, element_id, context, is_attributes_reactive) {
	const state = context.state;
	for (const directive of class_directives) {
		const value = /** @type {Expression} */ (context.visit(directive.expression));
		const update = b.stmt(b.call('$.toggle_class', element_id, b.literal(directive.name), value));
		const contains_call_expression = directive.expression.type === 'CallExpression';

		if (!is_attributes_reactive && contains_call_expression) {
			state.init.push(serialize_update(update));
		} else if (is_attributes_reactive || directive.metadata.dynamic || contains_call_expression) {
			state.update.push(update);
		} else {
			state.init.push(update);
		}
	}
}

/**
 * @param {Binding[]} references
 * @param {ComponentContext} context
 */
function serialize_transitive_dependencies(references, context) {
	/** @type {Set<Binding>} */
	const dependencies = new Set();

	for (const ref of references) {
		const deps = collect_transitive_dependencies(ref);
		for (const dep of deps) {
			dependencies.add(dep);
		}
	}

	return [...dependencies].map((dep) => serialize_get_binding({ ...dep.node }, context.state));
}

/**
 * @param {Binding} binding
 * @param {Set<Binding>} seen
 * @returns {Binding[]}
 */
function collect_transitive_dependencies(binding, seen = new Set()) {
	if (binding.kind !== 'legacy_reactive') return [];

	for (const dep of binding.legacy_dependencies) {
		if (!seen.has(dep)) {
			seen.add(dep);
			for (const transitive_dep of collect_transitive_dependencies(dep, seen)) {
				seen.add(transitive_dep);
			}
		}
	}

	return [...seen];
}

/**
 * Special case: if we have a value binding on a select element, we need to set up synchronization
 * between the value binding and inner signals, for indirect updates
 * @param {BindDirective} value_binding
 * @param {ComponentContext} context
 */
function setup_select_synchronization(value_binding, context) {
	if (context.state.analysis.runes) return;

	let bound = value_binding.expression;
	while (bound.type === 'MemberExpression') {
		bound = /** @type {Identifier | MemberExpression} */ (bound.object);
	}

	/** @type {string[]} */
	const names = [];

	for (const [name, refs] of context.state.scope.references) {
		if (
			refs.length > 0 &&
			// prevent infinite loop
			name !== bound.name
		) {
			names.push(name);
		}
	}

	const invalidator = b.call(
		'$.invalidate_inner_signals',
		b.thunk(
			b.block(
				names.map((name) => {
					const serialized = serialize_get_binding(b.id(name), context.state);
					return b.stmt(serialized);
				})
			)
		)
	);

	context.state.init.push(
		b.stmt(
			b.call(
				'$.template_effect',
				b.thunk(
					b.block([
						b.stmt(/** @type {Expression} */ (context.visit(value_binding.expression))),
						b.stmt(invalidator)
					])
				)
			)
		)
	);
}

/**
 * @param {Array<Attribute | SpreadAttribute>} attributes
 * @param {ComponentContext} context
 * @param {RegularElement} element
 * @param {Identifier} element_id
 * @param {boolean} needs_select_handling
 */
function serialize_element_spread_attributes(
	attributes,
	context,
	element,
	element_id,
	needs_select_handling
) {
	let needs_isolation = false;

	/** @type {ObjectExpression['properties']} */
	const values = [];

	for (const attribute of attributes) {
		if (attribute.type === 'Attribute') {
			const name = get_attribute_name(element, attribute, context);
			// TODO: handle contains_call_expression
			const [, value] = serialize_attribute_value(attribute.value, context);

			if (
				name === 'is' &&
				value.type === 'Literal' &&
				context.state.metadata.namespace === 'html'
			) {
				context.state.template.push(` is="${escape_html(value.value, true)}"`);
				continue;
			}

			if (
				is_event_attribute(attribute) &&
				(get_attribute_expression(attribute).type === 'ArrowFunctionExpression' ||
					get_attribute_expression(attribute).type === 'FunctionExpression')
			) {
				// Give the event handler a stable ID so it isn't removed and readded on every update
				const id = context.state.scope.generate('event_handler');
				context.state.init.push(b.var(id, value));
				values.push(b.init(attribute.name, b.id(id)));
			} else {
				values.push(b.init(name, value));
			}
		} else {
			values.push(b.spread(/** @type {Expression} */ (context.visit(attribute))));
		}

		needs_isolation ||=
			attribute.type === 'SpreadAttribute' && attribute.metadata.contains_call_expression;
	}

	const lowercase_attributes =
		element.metadata.svg || element.metadata.mathml || is_custom_element_node(element)
			? b.false
			: b.true;
	const id = context.state.scope.generate('attributes');

	const update = b.stmt(
		b.assignment(
			'=',
			b.id(id),
			b.call(
				'$.set_attributes',
				element_id,
				b.id(id),
				b.object(values),
				lowercase_attributes,
				b.literal(context.state.analysis.css.hash)
			)
		)
	);

	context.state.init.push(b.let(id));

	// objects could contain reactive getters -> play it safe and always assume spread attributes are reactive
	if (needs_isolation) {
		context.state.init.push(serialize_update(update));
	} else {
		context.state.update.push(update);
	}

	if (needs_select_handling) {
		context.state.init.push(
			b.stmt(b.call('$.init_select', element_id, b.thunk(b.member(b.id(id), b.id('value')))))
		);
		context.state.update.push(
			b.if(
				b.binary('in', b.literal('value'), b.id(id)),
				b.block([
					// This ensures a one-way street to the DOM in case it's <select {value}>
					// and not <select bind:value>. We need it in addition to $.init_select
					// because the select value is not reflected as an attribute, so the
					// mutation observer wouldn't notice.
					b.stmt(b.call('$.select_option', element_id, b.member(b.id(id), b.id('value'))))
				])
			)
		);
	}
}

/**
 * Serializes dynamic element attribute assignments.
 * Returns the `true` if spread is deemed reactive.
 * @param {Array<Attribute | SpreadAttribute>} attributes
 * @param {ComponentContext} context
 * @param {Identifier} element_id
 * @returns {boolean}
 */
function serialize_dynamic_element_attributes(attributes, context, element_id) {
	if (attributes.length === 0) {
		if (context.state.analysis.css.hash) {
			context.state.init.push(
				b.stmt(b.call('$.set_class', element_id, b.literal(context.state.analysis.css.hash)))
			);
		}
		return false;
	}

	// TODO why are we always treating this as a spread? needs docs, if that's not an error

	let needs_isolation = false;
	let is_reactive = false;

	/** @type {ObjectExpression['properties']} */
	const values = [];

	for (const attribute of attributes) {
		if (attribute.type === 'Attribute') {
			const [, value] = serialize_attribute_value(attribute.value, context);

			if (
				is_event_attribute(attribute) &&
				(get_attribute_expression(attribute).type === 'ArrowFunctionExpression' ||
					get_attribute_expression(attribute).type === 'FunctionExpression')
			) {
				// Give the event handler a stable ID so it isn't removed and readded on every update
				const id = context.state.scope.generate('event_handler');
				context.state.init.push(b.var(id, value));
				values.push(b.init(attribute.name, b.id(id)));
			} else {
				values.push(b.init(attribute.name, value));
			}
		} else {
			values.push(b.spread(/** @type {Expression} */ (context.visit(attribute))));
		}

		is_reactive ||=
			attribute.metadata.dynamic ||
			// objects could contain reactive getters -> play it safe and always assume spread attributes are reactive
			attribute.type === 'SpreadAttribute';
		needs_isolation ||=
			attribute.type === 'SpreadAttribute' && attribute.metadata.contains_call_expression;
	}

	if (needs_isolation || is_reactive) {
		const id = context.state.scope.generate('attributes');
		context.state.init.push(b.let(id));

		const update = b.stmt(
			b.assignment(
				'=',
				b.id(id),
				b.call(
					'$.set_dynamic_element_attributes',
					element_id,
					b.id(id),
					b.object(values),
					b.literal(context.state.analysis.css.hash)
				)
			)
		);

		if (needs_isolation) {
			context.state.init.push(serialize_update(update));
			return false;
		}

		context.state.update.push(update);
		return true;
	}

	context.state.init.push(
		b.stmt(
			b.call(
				'$.set_dynamic_element_attributes',
				element_id,
				b.literal(null),
				b.object(values),
				b.literal(context.state.analysis.css.hash)
			)
		)
	);
	return false;
}

/**
 * Serializes an assignment to an element property by adding relevant statements to either only
 * the init or the the init and update arrays, depending on whether or not the value is dynamic.
 * Resulting code for static looks something like this:
 * ```js
 * element.property = value;
 * // or
 * $.set_attribute(element, property, value);
 * });
 * ```
 * Resulting code for dynamic looks something like this:
 * ```js
 * let value;
 * $.template_effect(() => {
 * 	if (value !== (value = 'new value')) {
 * 		element.property = value;
 * 		// or
 * 		$.set_attribute(element, property, value);
 * 	}
 * });
 * ```
 * Returns true if attribute is deemed reactive, false otherwise.
 * @param {RegularElement} element
 * @param {Identifier} node_id
 * @param {Attribute} attribute
 * @param {ComponentContext} context
 * @returns {boolean}
 */
function serialize_element_attribute_update_assignment(element, node_id, attribute, context) {
	const state = context.state;
	const name = get_attribute_name(element, attribute, context);
	const is_svg = context.state.metadata.namespace === 'svg' || element.name === 'svg';
	const is_mathml = context.state.metadata.namespace === 'mathml';
	let [contains_call_expression, value] = serialize_attribute_value(attribute.value, context);

	// The foreign namespace doesn't have any special handling, everything goes through the attr function
	if (context.state.metadata.namespace === 'foreign') {
		const statement = b.stmt(b.call('$.set_attribute', node_id, b.literal(name), value));

		if (attribute.metadata.dynamic) {
			const id = state.scope.generate(`${node_id.name}_${name}`);
			serialize_update_assignment(state, id, undefined, value, statement);
			return true;
		} else {
			state.init.push(statement);
			return false;
		}
	}

	if (name === 'autofocus') {
		state.init.push(b.stmt(b.call('$.autofocus', node_id, value)));
		return false;
	}

	/** @type {Statement} */
	let update;

	if (name === 'class') {
		update = b.stmt(
			b.call(
				is_svg ? '$.set_svg_class' : is_mathml ? '$.set_mathml_class' : '$.set_class',
				node_id,
				value
			)
		);
	} else if (name === 'value') {
		update = b.stmt(b.call('$.set_value', node_id, value));
	} else if (name === 'checked') {
		update = b.stmt(b.call('$.set_checked', node_id, value));
	} else if (DOMProperties.includes(name)) {
		update = b.stmt(b.assignment('=', b.member(node_id, b.id(name)), value));
	} else {
		const callee = name.startsWith('xlink') ? '$.set_xlink_attribute' : '$.set_attribute';
		update = b.stmt(b.call(callee, node_id, b.literal(name), value));
	}

	if (attribute.metadata.dynamic) {
		if (contains_call_expression) {
			state.init.push(serialize_update(update));
		} else {
			state.update.push(update);
		}
		return true;
	} else {
		state.init.push(update);
		return false;
	}
}

/**
 * Like `serialize_element_attribute_update_assignment` but without any special attribute treatment.
 * @param {Identifier}	node_id
 * @param {Attribute} attribute
 * @param {ComponentContext} context
 * @returns {boolean}
 */
function serialize_custom_element_attribute_update_assignment(node_id, attribute, context) {
	const state = context.state;
	const name = attribute.name; // don't lowercase, as we set the element's property, which might be case sensitive
	let [contains_call_expression, value] = serialize_attribute_value(attribute.value, context);

	const update = b.stmt(b.call('$.set_custom_element_data', node_id, b.literal(name), value));

	if (attribute.metadata.dynamic) {
		if (contains_call_expression) {
			state.init.push(serialize_update(update));
		} else {
			state.update.push(update);
		}
		return true;
	} else {
		state.init.push(update);
		return false;
	}
}

/**
 * Serializes an assignment to the value property of a `<select>`, `<option>` or `<input>` element
 * that needs the hidden `__value` property.
 * Returns true if attribute is deemed reactive, false otherwise.
 * @param {string} element
 * @param {Identifier} node_id
 * @param {Attribute} attribute
 * @param {ComponentContext} context
 * @returns {boolean}
 */
function serialize_element_special_value_attribute(element, node_id, attribute, context) {
	const state = context.state;
	const [, value] = serialize_attribute_value(attribute.value, context);

	const inner_assignment = b.assignment(
		'=',
		b.member(node_id, b.id('value')),
		b.conditional(
			b.binary('==', b.literal(null), b.assignment('=', b.member(node_id, b.id('__value')), value)),
			b.literal(''), // render null/undefined values as empty string to support placeholder options
			value
		)
	);
	const is_reactive = attribute.metadata.dynamic;
	const is_select_with_value =
		// attribute.metadata.dynamic would give false negatives because even if the value does not change,
		// the inner options could still change, so we need to always treat it as reactive
		element === 'select' && attribute.value !== true && !is_text_attribute(attribute);

	const update = b.stmt(
		is_select_with_value
			? b.sequence([
					inner_assignment,
					// This ensures a one-way street to the DOM in case it's <select {value}>
					// and not <select bind:value>. We need it in addition to $.init_select
					// because the select value is not reflected as an attribute, so the
					// mutation observer wouldn't notice.
					b.call('$.select_option', node_id, value)
				])
			: inner_assignment
	);

	if (is_select_with_value) {
		state.init.push(b.stmt(b.call('$.init_select', node_id, b.thunk(value))));
	}

	if (is_reactive) {
		const id = state.scope.generate(`${node_id.name}_value`);
		serialize_update_assignment(
			state,
			id,
			// `<option>` is a special case: The value property reflects to the DOM. If the value is set to undefined,
			// that means the value should be set to the empty string. To be able to do that when the value is
			// initially undefined, we need to set a value that is guaranteed to be different.
			element === 'option' ? b.object([]) : undefined,
			value,
			update
		);
		return true;
	} else {
		state.init.push(update);
		return false;
	}
}

/**
 * @param {ComponentClientTransformState} state
 * @param {string} id
 * @param {Expression | undefined} init
 * @param {Expression} value
 * @param {ExpressionStatement} update
 */
function serialize_update_assignment(state, id, init, value, update) {
	state.init.push(b.var(id, init));
	state.update.push(
		b.if(b.binary('!==', b.id(id), b.assignment('=', b.id(id), value)), b.block([update]))
	);
}

/**
 * @param {ComponentContext} context
 */
function collect_parent_each_blocks(context) {
	return /** @type {EachBlock[]} */ (context.path.filter((node) => node.type === 'EachBlock'));
}

/**
 * @param {Component | SvelteComponent | SvelteSelf} node
 * @param {string} component_name
 * @param {ComponentContext} context
 * @param {Expression} anchor
 * @returns {Statement}
 */
function serialize_inline_component(node, component_name, context, anchor = context.state.node) {
	/** @type {Array<Property[] | Expression>} */
	const props_and_spreads = [];

	/** @type {ExpressionStatement[]} */
	const lets = [];

	/** @type {Record<string, TemplateNode[]>} */
	const children = {};

	/** @type {Record<string, Expression[]>} */
	const events = {};

	/** @type {Property[]} */
	const custom_css_props = [];

	/** @type {Identifier | MemberExpression | null} */
	let bind_this = null;

	/**
	 * @type {ExpressionStatement[]}
	 */
	const binding_initializers = [];

	/**
	 * If this component has a slot property, it is a named slot within another component. In this case
	 * the slot scope applies to the component itself, too, and not just its children.
	 */
	let slot_scope_applies_to_itself = false;

	/**
	 * Components may have a children prop and also have child nodes. In this case, we assume
	 * that the child component isn't using render tags yet and pass the slot as $$slots.default.
	 * We're not doing it for spread attributes, as this would result in too many false positives.
	 */
	let has_children_prop = false;

	/**
	 * @param {Property} prop
	 */
	function push_prop(prop) {
		const current = props_and_spreads.at(-1);
		const current_is_props = Array.isArray(current);
		const props = current_is_props ? current : [];
		props.push(prop);
		if (!current_is_props) {
			props_and_spreads.push(props);
		}
	}
	for (const attribute of node.attributes) {
		if (attribute.type === 'LetDirective') {
			lets.push(/** @type {ExpressionStatement} */ (context.visit(attribute)));
		} else if (attribute.type === 'OnDirective') {
			events[attribute.name] ||= [];
			let handler = serialize_event_handler(attribute, null, context);
			if (attribute.modifiers.includes('once')) {
				handler = b.call('$.once', handler);
			}
			events[attribute.name].push(handler);
		} else if (attribute.type === 'SpreadAttribute') {
			const expression = /** @type {Expression} */ (context.visit(attribute));
			if (attribute.metadata.dynamic) {
				let value = expression;

				if (attribute.metadata.contains_call_expression) {
					const id = b.id(context.state.scope.generate('spread_element'));
					context.state.init.push(b.var(id, b.call('$.derived', b.thunk(value))));
					value = b.call('$.get', id);
				}

				props_and_spreads.push(b.thunk(value));
			} else {
				props_and_spreads.push(expression);
			}
		} else if (attribute.type === 'Attribute') {
			if (attribute.name.startsWith('--')) {
				custom_css_props.push(
					b.init(attribute.name, serialize_attribute_value(attribute.value, context)[1])
				);
				continue;
			}

			if (attribute.name === 'slot') {
				slot_scope_applies_to_itself = true;
			}

			if (attribute.name === 'children') {
				has_children_prop = true;
			}

			const [, value] = serialize_attribute_value(attribute.value, context);

			if (attribute.metadata.dynamic) {
				let arg = value;

				// When we have a non-simple computation, anything other than an Identifier or Member expression,
				// then there's a good chance it needs to be memoized to avoid over-firing when read within the
				// child component.
				const should_wrap_in_derived = get_attribute_chunks(attribute.value).some((n) => {
					return (
						n.type === 'ExpressionTag' &&
						n.expression.type !== 'Identifier' &&
						n.expression.type !== 'MemberExpression'
					);
				});

				if (should_wrap_in_derived) {
					const id = b.id(context.state.scope.generate(attribute.name));
					context.state.init.push(b.var(id, create_derived(context.state, b.thunk(value))));
					arg = b.call('$.get', id);
				}

				push_prop(b.get(attribute.name, [b.return(arg)]));
			} else {
				push_prop(b.init(attribute.name, value));
			}
		} else if (attribute.type === 'BindDirective') {
			const expression = /** @type {Expression} */ (context.visit(attribute.expression));

			// serialize_validate_binding will add a function that specifically throw
			// `binding_property_non_reactive` error. If there's a svelte ignore
			// before we avoid adding this validation to avoid throwing the runtime warning
			const to_ignore = ignore_map
				.get(node)
				?.some((code) => code.has('binding_property_non_reactive'));

			if (
				expression.type === 'MemberExpression' &&
				context.state.options.dev &&
				context.state.analysis.runes &&
				!to_ignore
			) {
				context.state.init.push(serialize_validate_binding(context.state, attribute, expression));
			}

			if (attribute.name === 'this') {
				bind_this = attribute.expression;
			} else {
				if (context.state.options.dev) {
					binding_initializers.push(
						b.stmt(b.call(b.id('$.add_owner_effect'), b.thunk(expression), b.id(component_name)))
					);
				}

				push_prop(b.get(attribute.name, [b.return(expression)]));

				const assignment = b.assignment('=', attribute.expression, b.id('$$value'));
				push_prop(
					b.set(attribute.name, [
						b.stmt(serialize_set_binding(assignment, context, () => context.visit(assignment)))
					])
				);
			}
		}
	}

	if (slot_scope_applies_to_itself) {
		context.state.init.push(...lets);
	}

	if (Object.keys(events).length > 0) {
		const events_expression = b.object(
			Object.keys(events).map((name) =>
				b.init(name, events[name].length > 1 ? b.array(events[name]) : events[name][0])
			)
		);
		push_prop(b.init('$$events', events_expression));
	}

	/** @type {Statement[]} */
	const snippet_declarations = [];

	// Group children by slot
	for (const child of node.fragment.nodes) {
		if (child.type === 'SnippetBlock') {
			// the SnippetBlock visitor adds a declaration to `init`, but if it's directly
			// inside a component then we want to hoist them into a block so that they
			// can be used as props without creating conflicts
			context.visit(child, {
				...context.state,
				init: snippet_declarations
			});

			push_prop(b.prop('init', child.expression, child.expression));

			continue;
		}

		let slot_name = 'default';

		if (is_element_node(child)) {
			const attribute = /** @type {Attribute | undefined} */ (
				child.attributes.find(
					(attribute) => attribute.type === 'Attribute' && attribute.name === 'slot'
				)
			);

			if (attribute !== undefined) {
				slot_name = /** @type {Text[]} */ (attribute.value)[0].data;
			}
		}

		(children[slot_name] ||= []).push(child);
	}

	// Serialize each slot
	/** @type {Property[]} */
	const serialized_slots = [];
	for (const slot_name of Object.keys(children)) {
		const block = /** @type {BlockStatement} */ (
			context.visit(
				{
					...node.fragment,
					// @ts-expect-error
					nodes: children[slot_name]
				},
				{
					...context.state,
					scope:
						context.state.scopes.get(slot_name === 'default' ? children[slot_name][0] : node) ??
						context.state.scope
				}
			)
		);

		if (block.body.length === 0) continue;

		const slot_fn = b.arrow(
			[b.id('$$anchor'), b.id('$$slotProps')],
			b.block([
				...(slot_name === 'default' && !slot_scope_applies_to_itself ? lets : []),
				...block.body
			])
		);

		if (slot_name === 'default' && !has_children_prop) {
			if (lets.length === 0 && children.default.every((node) => node.type !== 'SvelteFragment')) {
				// create `children` prop...
				push_prop(
					b.init(
						'children',
						context.state.options.dev
							? b.call('$.wrap_snippet', b.id(context.state.analysis.name), slot_fn)
							: slot_fn
					)
				);

				// and `$$slots.default: true` so that `<slot>` on the child works
				serialized_slots.push(b.init(slot_name, b.true));
			} else {
				// create `$$slots.default`...
				serialized_slots.push(b.init(slot_name, slot_fn));

				// and a `children` prop that errors
				push_prop(b.init('children', b.id('$.invalid_default_snippet')));
			}
		} else {
			serialized_slots.push(b.init(slot_name, slot_fn));
		}
	}

	if (serialized_slots.length > 0) {
		push_prop(b.init('$$slots', b.object(serialized_slots)));
	}

	if (!context.state.analysis.runes) {
		push_prop(b.init('$$legacy', b.true));
	}

	const props_expression =
		props_and_spreads.length === 0 ||
		(props_and_spreads.length === 1 && Array.isArray(props_and_spreads[0]))
			? b.object(/** @type {Property[]} */ (props_and_spreads[0]) || [])
			: b.call(
					'$.spread_props',
					...props_and_spreads.map((p) => (Array.isArray(p) ? b.object(p) : p))
				);

	/** @param {Expression} node_id */
	let fn = (node_id) => {
		return b.call(component_name, node_id, props_expression);
	};

	if (bind_this !== null) {
		const prev = fn;

		fn = (node_id) => {
			return serialize_bind_this(bind_this, prev(node_id), context);
		};
	}

	const statements = [...snippet_declarations];

	if (node.type === 'SvelteComponent') {
		const prev = fn;

		fn = (node_id) => {
			return b.call(
				'$.component',
				node_id,
				b.thunk(/** @type {Expression} */ (context.visit(node.expression))),
				b.arrow(
					[b.id('$$anchor'), b.id(component_name)],
					b.block([
						...binding_initializers,
						b.stmt(
							context.state.options.dev
								? b.call('$.validate_dynamic_component', b.thunk(prev(b.id('$$anchor'))))
								: prev(b.id('$$anchor'))
						)
					])
				)
			);
		};
	} else {
		statements.push(...binding_initializers);
	}

	if (Object.keys(custom_css_props).length > 0) {
		context.state.template.push(
			context.state.metadata.namespace === 'svg'
				? '<g><!></g>'
				: '<div style="display: contents"><!></div>'
		);

		statements.push(
			b.stmt(b.call('$.css_props', anchor, b.thunk(b.object(custom_css_props)))),
			b.stmt(fn(b.member(anchor, b.id('lastChild')))),
			b.stmt(b.call('$.reset', anchor))
		);
	} else {
		context.state.template.push('<!>');
		statements.push(b.stmt(fn(anchor)));
	}

	return statements.length > 1 ? b.block(statements) : statements[0];
}

/**
 * Serializes `bind:this` for components and elements.
 * @param {Identifier | MemberExpression} expression
 * @param {Expression} value
 * @param {import('zimmerframe').Context<SvelteNode, ComponentClientTransformState>} context
 */
function serialize_bind_this(expression, value, { state, visit }) {
	/** @type {Identifier[]} */
	const ids = [];

	/** @type {Expression[]} */
	const values = [];

	/** @type {typeof state.getters} */
	const getters = {};

	// Pass in each context variables to the get/set functions, so that we can null out old values on teardown.
	// Note that we only do this for each context variables, the consequence is that the value might be stale in
	// some scenarios where the value is a member expression with changing computed parts or using a combination of multiple
	// variables, but that was the same case in Svelte 4, too. Once legacy mode is gone completely, we can revisit this.
	walk(expression, null, {
		Identifier(node, { path }) {
			if (Object.hasOwn(getters, node.name)) return;

			const parent = /** @type {Expression} */ (path.at(-1));
			if (!is_reference(node, parent)) return;

			const binding = state.scope.get(node.name);
			if (!binding) return;

			for (const [owner, scope] of state.scopes) {
				if (owner.type === 'EachBlock' && scope === binding.scope) {
					ids.push(node);
					values.push(/** @type {Expression} */ (visit(node)));
					getters[node.name] = node;
					break;
				}
			}
		}
	});

	const child_state = { ...state, getters: { ...state.getters, ...getters } };

	const get = /** @type {Expression} */ (visit(expression, child_state));
	const set = /** @type {Expression} */ (
		visit(b.assignment('=', expression, b.id('$$value')), child_state)
	);

	// If we're mutating a property, then it might already be non-existent.
	// If we make all the object nodes optional, then it avoids any runtime exceptions.
	/** @type {Expression | Super} */
	let node = get;

	while (node.type === 'MemberExpression') {
		node.optional = true;
		node = node.object;
	}

	return b.call(
		'$.bind_this',
		value,
		b.arrow([b.id('$$value'), ...ids], set),
		b.arrow([...ids], get),
		values.length > 0 && b.thunk(b.array(values))
	);
}

/**
 * @param {SourceLocation[]} locations
 */
function serialize_locations(locations) {
	return b.array(
		locations.map((loc) => {
			const expression = b.array([b.literal(loc[0]), b.literal(loc[1])]);

			if (loc.length === 3) {
				expression.elements.push(serialize_locations(loc[2]));
			}

			return expression;
		})
	);
}

/**
 *
 * @param {Namespace} namespace
 * @param {ComponentClientTransformState} state
 * @returns
 */
function get_template_function(namespace, state) {
	const contains_script_tag = state.metadata.context.template_contains_script_tag;
	return namespace === 'svg'
		? contains_script_tag
			? '$.svg_template_with_script'
			: '$.ns_template'
		: namespace === 'mathml'
			? '$.mathml_template'
			: contains_script_tag
				? '$.template_with_script'
				: '$.template';
}

/**
 *
 * @param {Statement} statement
 */
function serialize_update(statement) {
	const body =
		statement.type === 'ExpressionStatement' ? statement.expression : b.block([statement]);

	return b.stmt(b.call('$.template_effect', b.thunk(body)));
}

/**
 * @param {Statement[]} update
 */
function serialize_render_stmt(update) {
	return update.length === 1
		? serialize_update(update[0])
		: b.stmt(b.call('$.template_effect', b.thunk(b.block(update))));
}

/**
 * Serializes the event handler function of the `on:` directive
 * @param {Pick<OnDirective, 'name' | 'modifiers' | 'expression'>} node
 * @param {null | { contains_call_expression: boolean; dynamic: boolean; } | null} metadata
 * @param {ComponentContext} context
 */
function serialize_event_handler(node, metadata, { state, visit }) {
	/** @type {Expression} */
	let handler;

	if (node.expression) {
		handler = node.expression;

		// Event handlers can be dynamic (source/store/prop/conditional etc)
		const dynamic_handler = () =>
			b.function(
				null,
				[b.rest(b.id('$$args'))],
				b.block([
					b.return(
						b.call(
							b.member(/** @type {Expression} */ (visit(handler)), b.id('apply'), false, true),
							b.this,
							b.id('$$args')
						)
					)
				])
			);

		if (
			metadata?.contains_call_expression &&
			!(
				(handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression') &&
				handler.metadata.hoistable
			)
		) {
			// Create a derived dynamic event handler
			const id = b.id(state.scope.generate('event_handler'));

			state.init.push(
				b.var(id, b.call('$.derived', b.thunk(/** @type {Expression} */ (visit(handler)))))
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
		} else if (handler.type === 'Identifier' || handler.type === 'MemberExpression') {
			const id = object(handler);
			const binding = id === null ? null : state.scope.get(id.name);
			if (
				binding !== null &&
				(binding.kind === 'state' ||
					binding.kind === 'frozen_state' ||
					binding.declaration_kind === 'import' ||
					binding.kind === 'legacy_reactive' ||
					binding.kind === 'derived' ||
					binding.kind === 'prop' ||
					binding.kind === 'bindable_prop' ||
					binding.kind === 'store_sub')
			) {
				handler = dynamic_handler();
			} else {
				handler = /** @type {Expression} */ (visit(handler));
			}
		} else if (handler.type === 'ConditionalExpression' || handler.type === 'LogicalExpression') {
			handler = dynamic_handler();
		} else {
			handler = /** @type {Expression} */ (visit(handler));
		}
	} else {
		state.analysis.needs_props = true;

		// Function + .call to preserve "this" context as much as possible
		handler = b.function(
			null,
			[b.id('$$arg')],
			b.block([b.stmt(b.call('$.bubble_event.call', b.this, b.id('$$props'), b.id('$$arg')))])
		);
	}

	if (node.modifiers.includes('stopPropagation')) {
		handler = b.call('$.stopPropagation', handler);
	}
	if (node.modifiers.includes('stopImmediatePropagation')) {
		handler = b.call('$.stopImmediatePropagation', handler);
	}
	if (node.modifiers.includes('preventDefault')) {
		handler = b.call('$.preventDefault', handler);
	}
	if (node.modifiers.includes('self')) {
		handler = b.call('$.self', handler);
	}
	if (node.modifiers.includes('trusted')) {
		handler = b.call('$.trusted', handler);
	}

	return handler;
}

/**
 * Serializes an event handler function of the `on:` directive or an attribute starting with `on`
 * @param {{name: string;modifiers: string[];expression: Expression | null;delegated?: DelegatedEvent | null;}} node
 * @param {null | { contains_call_expression: boolean; dynamic: boolean; }} metadata
 * @param {ComponentContext} context
 */
function serialize_event(node, metadata, context) {
	const state = context.state;

	/** @type {Expression} */
	let expression;

	if (node.expression) {
		let handler = serialize_event_handler(node, metadata, context);
		const event_name = node.name;
		const delegated = node.delegated;

		if (delegated != null) {
			let delegated_assignment;

			if (!state.events.has(event_name)) {
				state.events.add(event_name);
			}
			// Hoist function if we can, otherwise we leave the function as is
			if (delegated.type === 'hoistable') {
				if (delegated.function === node.expression) {
					const func_name = context.state.scope.root.unique('on_' + event_name);
					state.hoisted.push(b.var(func_name, handler));
					handler = func_name;
				}
				if (node.modifiers.includes('once')) {
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
				if (node.modifiers.includes('once')) {
					handler = b.call('$.once', handler);
				}
				delegated_assignment = handler;
			}

			state.init.push(
				b.stmt(
					b.assignment(
						'=',
						b.member(context.state.node, b.id('__' + event_name)),
						delegated_assignment
					)
				)
			);
			return;
		}

		if (node.modifiers.includes('once')) {
			handler = b.call('$.once', handler);
		}

		const args = [
			b.literal(event_name),
			context.state.node,
			handler,
			b.literal(node.modifiers.includes('capture'))
		];

		if (node.modifiers.includes('passive')) {
			args.push(b.literal(true));
		} else if (node.modifiers.includes('nonpassive')) {
			args.push(b.literal(false));
		} else if (PassiveEvents.includes(node.name)) {
			args.push(b.literal(true));
		}

		// Events need to run in order with bindings/actions
		expression = b.call('$.event', ...args);
	} else {
		expression = b.call(
			'$.event',
			b.literal(node.name),
			state.node,
			serialize_event_handler(node, metadata, context)
		);
	}

	const parent = /** @type {SvelteNode} */ (context.path.at(-1));
	const has_action_directive =
		parent.type === 'RegularElement' && parent.attributes.find((a) => a.type === 'UseDirective');
	const statement = b.stmt(
		has_action_directive ? b.call('$.effect', b.thunk(expression)) : expression
	);

	if (
		parent.type === 'SvelteDocument' ||
		parent.type === 'SvelteWindow' ||
		parent.type === 'SvelteBody'
	) {
		// These nodes are above the component tree, and its events should run parent first
		state.before_init.push(statement);
	} else {
		state.after_update.push(statement);
	}
}

/**
 * @param {Attribute & { value: ExpressionTag | [ExpressionTag] }} node
 * @param {ComponentContext} context
 */
function serialize_event_attribute(node, context) {
	/** @type {string[]} */
	const modifiers = [];

	let event_name = node.name.slice(2);
	if (is_capture_event(event_name)) {
		event_name = event_name.slice(0, -7);
		modifiers.push('capture');
	}

	serialize_event(
		{
			name: event_name,
			expression: get_attribute_expression(node),
			modifiers,
			delegated: node.metadata.delegated
		},
		!Array.isArray(node.value) && node.value?.type === 'ExpressionTag' ? node.value.metadata : null,
		context
	);
}

/**
 * Processes an array of template nodes, joining sibling text/expression nodes
 * (e.g. `{a} b {c}`) into a single update function. Along the way it creates
 * corresponding template node references these updates are applied to.
 * @param {SvelteNode[]} nodes
 * @param {(is_text: boolean) => Expression} expression
 * @param {boolean} is_element
 * @param {ComponentContext} context
 */
function process_children(nodes, expression, is_element, { visit, state }) {
	const within_bound_contenteditable = state.metadata.bound_contenteditable;

	/** @typedef {Array<Text | ExpressionTag>} Sequence */

	/** @type {Sequence} */
	let sequence = [];

	/**
	 * @param {Sequence} sequence
	 */
	function flush_sequence(sequence) {
		if (sequence.length === 1) {
			const node = sequence[0];

			if (node.type === 'Text') {
				let prev = expression;
				expression = () => b.call('$.sibling', prev(true));
				state.template.push(node.raw);
				return;
			}

			state.template.push(' ');

			const text_id = get_node_id(expression(true), state, 'text');

			const update = b.stmt(
				b.call('$.set_text', text_id, /** @type {Expression} */ (visit(node.expression, state)))
			);

			if (node.metadata.contains_call_expression && !within_bound_contenteditable) {
				state.init.push(serialize_update(update));
			} else if (node.metadata.dynamic && !within_bound_contenteditable) {
				state.update.push(update);
			} else {
				state.init.push(
					b.stmt(
						b.assignment(
							'=',
							b.member(text_id, b.id('nodeValue')),
							/** @type {Expression} */ (visit(node.expression))
						)
					)
				);
			}

			expression = (is_text) =>
				is_text ? b.call('$.sibling', text_id, b.true) : b.call('$.sibling', text_id);
		} else {
			const text_id = get_node_id(expression(true), state, 'text');

			state.template.push(' ');

			const [contains_call_expression, value] = serialize_template_literal(sequence, visit, state);

			const update = b.stmt(b.call('$.set_text', text_id, value));

			if (contains_call_expression && !within_bound_contenteditable) {
				state.init.push(serialize_update(update));
			} else if (
				sequence.some((node) => node.type === 'ExpressionTag' && node.metadata.dynamic) &&
				!within_bound_contenteditable
			) {
				state.update.push(update);
			} else {
				state.init.push(b.stmt(b.assignment('=', b.member(text_id, b.id('nodeValue')), value)));
			}

			expression = (is_text) =>
				is_text ? b.call('$.sibling', text_id, b.true) : b.call('$.sibling', text_id);
		}
	}

	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];

		if (node.type === 'Text' || node.type === 'ExpressionTag') {
			sequence.push(node);
		} else {
			if (sequence.length > 0) {
				flush_sequence(sequence);
				sequence = [];
			}

			if (
				node.type === 'SvelteHead' ||
				node.type === 'TitleElement' ||
				node.type === 'SnippetBlock'
			) {
				// These nodes do not contribute to the sibling/child tree
				// TODO what about e.g. ConstTag and all the other things that
				// get hoisted inside clean_nodes?
				visit(node, state);
			} else {
				if (node.type === 'EachBlock' && nodes.length === 1 && is_element) {
					node.metadata.is_controlled = true;
					visit(node, state);
				} else {
					const id = get_node_id(
						expression(false),
						state,
						node.type === 'RegularElement' ? node.name : 'node'
					);

					expression = (is_text) =>
						is_text ? b.call('$.sibling', id, b.true) : b.call('$.sibling', id);

					visit(node, {
						...state,
						node: id
					});
				}
			}
		}
	}

	if (sequence.length > 0) {
		// if the final item in a fragment is static text,
		// we need to force `hydrate_node` to advance
		if (sequence.length === 1 && sequence[0].type === 'Text' && nodes.length > 1) {
			state.init.push(b.stmt(b.call('$.next')));
		}

		flush_sequence(sequence);
	}
}

/**
 * @param {Expression} expression
 * @param {ComponentClientTransformState} state
 * @param {string} name
 */
function get_node_id(expression, state, name) {
	let id = expression;

	if (id.type !== 'Identifier') {
		id = b.id(state.scope.generate(name));

		state.init.push(b.var(id, expression));
	}
	return id;
}

/**
 * @param {Attribute['value']} value
 * @param {ComponentContext} context
 * @returns {[contains_call_expression: boolean, Expression]}
 */
function serialize_attribute_value(value, context) {
	if (value === true) {
		return [false, b.literal(true)];
	}

	if (!Array.isArray(value) || value.length === 1) {
		const chunk = Array.isArray(value) ? value[0] : value;

		if (chunk.type === 'Text') {
			return [false, b.literal(chunk.data)];
		}

		return [
			chunk.metadata.contains_call_expression,
			/** @type {Expression} */ (context.visit(chunk.expression))
		];
	}

	return serialize_template_literal(value, context.visit, context.state);
}

/**
 * @param {Array<Text | ExpressionTag>} values
 * @param {(node: SvelteNode, state: any) => any} visit
 * @param {ComponentClientTransformState} state
 * @returns {[boolean, TemplateLiteral]}
 */
function serialize_template_literal(values, visit, state) {
	/** @type {TemplateElement[]} */
	const quasis = [];

	/** @type {Expression[]} */
	const expressions = [];
	let contains_call_expression = false;
	let contains_multiple_call_expression = false;
	quasis.push(b.quasi(''));

	for (let i = 0; i < values.length; i++) {
		const node = values[i];

		if (node.type === 'ExpressionTag' && node.metadata.contains_call_expression) {
			if (contains_call_expression) {
				contains_multiple_call_expression = true;
			}
			contains_call_expression = true;
		}
	}

	for (let i = 0; i < values.length; i++) {
		const node = values[i];

		if (node.type === 'Text') {
			const last = /** @type {TemplateElement} */ (quasis.at(-1));
			last.value.raw += sanitize_template_string(node.data);
		} else if (node.type === 'ExpressionTag' && node.expression.type === 'Literal') {
			const last = /** @type {TemplateElement} */ (quasis.at(-1));
			if (node.expression.value != null) {
				last.value.raw += sanitize_template_string(node.expression.value + '');
			}
		} else {
			if (contains_multiple_call_expression) {
				const id = b.id(state.scope.generate('stringified_text'));

				state.init.push(
					b.const(
						id,
						create_derived(
							state,
							b.thunk(/** @type {Expression} */ (visit(node.expression, state)))
						)
					)
				);
				expressions.push(b.call('$.get', id));
			} else {
				expressions.push(b.logical('??', visit(node.expression, state), b.literal('')));
			}
			quasis.push(b.quasi('', i + 1 === values.length));
		}
	}

	// TODO instead of this tuple, return a `{ dynamic, complex, value }` object. will DRY stuff out
	return [contains_call_expression, b.template(quasis, expressions)];
}

/** @type {ComponentVisitors} */
export const template_visitors = {
	Fragment(node, context) {
		// Creates a new block which looks roughly like this:
		// ```js
		// // hoisted:
		// const block_name = $.template(`...`);
		//
		// // for the main block:
		// const id = block_name();
		// // init stuff and possibly render effect
		// $.append($$anchor, id);
		// ```
		// Adds the hoisted parts to `context.state.hoisted` and returns the statements of the main block.

		const parent = context.path.at(-1) ?? node;

		const namespace = infer_namespace(context.state.metadata.namespace, parent, node.nodes);

		const { hoisted, trimmed, is_standalone, is_text_first } = clean_nodes(
			parent,
			node.nodes,
			context.path,
			namespace,
			context.state,
			context.state.preserve_whitespace,
			context.state.options.preserveComments
		);

		if (hoisted.length === 0 && trimmed.length === 0) {
			return b.block([]);
		}

		const is_single_element = trimmed.length === 1 && trimmed[0].type === 'RegularElement';
		const is_single_child_not_needing_template =
			trimmed.length === 1 &&
			(trimmed[0].type === 'SvelteFragment' || trimmed[0].type === 'TitleElement');

		const template_name = context.state.scope.root.unique('root'); // TODO infer name from parent

		/** @type {Statement[]} */
		const body = [];

		/** @type {Statement | undefined} */
		let close = undefined;

		/** @type {ComponentClientTransformState} */
		const state = {
			...context.state,
			before_init: [],
			init: [],
			update: [],
			after_update: [],
			template: [],
			locations: [],
			getters: { ...context.state.getters },
			metadata: {
				context: {
					template_needs_import_node: false,
					template_contains_script_tag: false
				},
				namespace,
				bound_contenteditable: context.state.metadata.bound_contenteditable
			}
		};

		for (const node of hoisted) {
			context.visit(node, state);
		}

		if (is_text_first) {
			// skip over inserted comment
			body.push(b.stmt(b.call('$.next')));
		}

		/**
		 * @param {Identifier} template_name
		 * @param {Expression[]} args
		 */
		const add_template = (template_name, args) => {
			let call = b.call(get_template_function(namespace, state), ...args);
			if (context.state.options.dev) {
				call = b.call(
					'$.add_locations',
					call,
					b.member(b.id(context.state.analysis.name), b.id('$.FILENAME'), true),
					serialize_locations(state.locations)
				);
			}

			context.state.hoisted.push(b.var(template_name, call));
		};

		if (is_single_element) {
			const element = /** @type {RegularElement} */ (trimmed[0]);

			const id = b.id(context.state.scope.generate(element.name));

			context.visit(element, {
				...state,
				node: id
			});

			/** @type {Expression[]} */
			const args = [b.template([b.quasi(state.template.join(''), true)], [])];

			if (state.metadata.context.template_needs_import_node) {
				args.push(b.literal(TEMPLATE_USE_IMPORT_NODE));
			}

			add_template(template_name, args);

			body.push(b.var(id, b.call(template_name)), ...state.before_init, ...state.init);
			close = b.stmt(b.call('$.append', b.id('$$anchor'), id));
		} else if (is_single_child_not_needing_template) {
			context.visit(trimmed[0], state);
			body.push(...state.before_init, ...state.init);
		} else if (trimmed.length > 0) {
			const id = b.id(context.state.scope.generate('fragment'));

			const use_space_template =
				trimmed.some((node) => node.type === 'ExpressionTag') &&
				trimmed.every((node) => node.type === 'Text' || node.type === 'ExpressionTag');

			if (use_space_template) {
				// special case — we can use `$.text` instead of creating a unique template
				const id = b.id(context.state.scope.generate('text'));

				process_children(trimmed, () => id, false, {
					...context,
					state
				});

				body.push(b.var(id, b.call('$.text')), ...state.before_init, ...state.init);
				close = b.stmt(b.call('$.append', b.id('$$anchor'), id));
			} else {
				if (is_standalone) {
					// no need to create a template, we can just use the existing block's anchor
					process_children(trimmed, () => b.id('$$anchor'), false, { ...context, state });
				} else {
					/** @type {(is_text: boolean) => Expression} */
					const expression = (is_text) => b.call('$.first_child', id, is_text && b.true);

					process_children(trimmed, expression, false, { ...context, state });

					let flags = TEMPLATE_FRAGMENT;

					if (state.metadata.context.template_needs_import_node) {
						flags |= TEMPLATE_USE_IMPORT_NODE;
					}

					if (state.template.length === 1 && state.template[0] === '<!>') {
						// special case — we can use `$.comment` instead of creating a unique template
						body.push(b.var(id, b.call('$.comment')));
					} else {
						add_template(template_name, [
							b.template([b.quasi(state.template.join(''), true)], []),
							b.literal(flags)
						]);

						body.push(b.var(id, b.call(template_name)));
					}

					close = b.stmt(b.call('$.append', b.id('$$anchor'), id));
				}

				body.push(...state.before_init, ...state.init);
			}
		} else {
			body.push(...state.before_init, ...state.init);
		}

		if (state.update.length > 0) {
			body.push(serialize_render_stmt(state.update));
		}

		body.push(...state.after_update);

		if (close !== undefined) {
			// It's important that close is the last statement in the block, as any previous statements
			// could contain element insertions into the template, which the close statement needs to
			// know of when constructing the list of current inner elements.
			body.push(close);
		}

		return b.block(body);
	},
	Comment(node, context) {
		// We'll only get here if comments are not filtered out, which they are unless preserveComments is true
		context.state.template.push(`<!--${node.data}-->`);
	},
	HtmlTag(node, context) {
		context.state.template.push('<!>');

		// push into init, so that bindings run afterwards, which might trigger another run and override hydration
		context.state.init.push(
			b.stmt(
				b.call(
					'$.html',
					context.state.node,
					b.thunk(/** @type {Expression} */ (context.visit(node.expression))),
					b.literal(context.state.metadata.namespace === 'svg'),
					b.literal(context.state.metadata.namespace === 'mathml')
				)
			)
		);
	},
	ConstTag(node, { state, visit }) {
		const declaration = node.declaration.declarations[0];
		// TODO we can almost certainly share some code with $derived(...)
		if (declaration.id.type === 'Identifier') {
			state.init.push(
				b.const(
					declaration.id,
					create_derived(state, b.thunk(/** @type {Expression} */ (visit(declaration.init))))
				)
			);

			state.getters[declaration.id.name] = b.call('$.get', declaration.id);

			// we need to eagerly evaluate the expression in order to hit any
			// 'Cannot access x before initialization' errors
			if (state.options.dev) {
				state.init.push(b.stmt(b.call('$.get', declaration.id)));
			}
		} else {
			const identifiers = extract_identifiers(declaration.id);
			const tmp = b.id(state.scope.generate('computed_const'));

			const getters = { ...state.getters };

			// Make all identifiers that are declared within the following computed regular
			// variables, as they are not signals in that context yet
			for (const node of identifiers) {
				getters[node.name] = node;
			}

			const child_state = { ...state, getters };

			// TODO optimise the simple `{ x } = y` case — we can just return `y`
			// instead of destructuring it only to return a new object
			const fn = b.arrow(
				[],
				b.block([
					b.const(
						/** @type {Pattern} */ (visit(declaration.id, child_state)),
						/** @type {Expression} */ (visit(declaration.init, child_state))
					),
					b.return(b.object(identifiers.map((node) => b.prop('init', node, node))))
				])
			);

			state.init.push(b.const(tmp, create_derived(state, fn)));

			// we need to eagerly evaluate the expression in order to hit any
			// 'Cannot access x before initialization' errors
			if (state.options.dev) {
				state.init.push(b.stmt(b.call('$.get', tmp)));
			}

			for (const node of identifiers) {
				state.getters[node.name] = b.member(b.call('$.get', tmp), node);
			}
		}
	},
	DebugTag(node, { state, visit }) {
		state.init.push(
			b.stmt(
				b.call(
					'$.template_effect',
					b.thunk(
						b.block([
							b.stmt(
								b.call(
									'console.log',
									b.object(
										node.identifiers.map((identifier) =>
											b.prop('init', identifier, /** @type {Expression} */ (visit(identifier)))
										)
									)
								)
							),
							b.debugger
						])
					)
				)
			)
		);
	},
	RenderTag(node, context) {
		context.state.template.push('<!>');
		const callee = unwrap_optional(node.expression).callee;
		const raw_args = unwrap_optional(node.expression).arguments;

		/** @type {Expression[]} */
		let args = [];
		for (let i = 0; i < raw_args.length; i++) {
			const raw = raw_args[i];
			const arg = /** @type {Expression} */ (context.visit(raw));
			if (node.metadata.args_with_call_expression.has(i)) {
				const id = b.id(context.state.scope.generate('render_arg'));
				context.state.init.push(b.var(id, b.call('$.derived_safe_equal', b.thunk(arg))));
				args.push(b.thunk(b.call('$.get', id)));
			} else {
				args.push(b.thunk(arg));
			}
		}

		let snippet_function = /** @type {Expression} */ (context.visit(callee));

		if (node.metadata.dynamic) {
			context.state.init.push(
				b.stmt(b.call('$.snippet', context.state.node, b.thunk(snippet_function), ...args))
			);
		} else {
			context.state.init.push(
				b.stmt(
					(node.expression.type === 'CallExpression' ? b.call : b.maybe_call)(
						snippet_function,
						context.state.node,
						...args
					)
				)
			);
		}
	},
	AnimateDirective(node, { state, visit }) {
		const expression =
			node.expression === null
				? b.literal(null)
				: b.thunk(/** @type {Expression} */ (visit(node.expression)));

		// in after_update to ensure it always happens after bind:this
		state.after_update.push(
			b.stmt(
				b.call(
					'$.animation',
					state.node,
					b.thunk(/** @type {Expression} */ (visit(parse_directive_name(node.name)))),
					expression
				)
			)
		);
	},
	ClassDirective(node, { state, next }) {
		throw new Error('Node should have been handled elsewhere');
	},
	StyleDirective(node, { state, next }) {
		throw new Error('Node should have been handled elsewhere');
	},
	TransitionDirective(node, { state, visit }) {
		let flags = node.modifiers.includes('global') ? TRANSITION_GLOBAL : 0;
		if (node.intro) flags |= TRANSITION_IN;
		if (node.outro) flags |= TRANSITION_OUT;

		const args = [
			b.literal(flags),
			state.node,
			b.thunk(/** @type {Expression} */ (visit(parse_directive_name(node.name))))
		];

		if (node.expression) {
			args.push(b.thunk(/** @type {Expression} */ (visit(node.expression))));
		}

		// in after_update to ensure it always happens after bind:this
		state.after_update.push(b.stmt(b.call('$.transition', ...args)));
	},
	RegularElement(node, context) {
		/** @type {SourceLocation} */
		let location = [-1, -1];

		if (context.state.options.dev) {
			const loc = locator(node.start);
			if (loc) {
				location[0] = loc.line;
				location[1] = loc.column;
				context.state.locations.push(location);
			}
		}

		if (node.name === 'noscript') {
			context.state.template.push('<noscript></noscript>');
			return;
		}
		if (node.name === 'script') {
			context.state.metadata.context.template_contains_script_tag = true;
		}

		const metadata = context.state.metadata;
		const child_metadata = {
			...context.state.metadata,
			namespace: determine_namespace_for_children(node, context.state.metadata.namespace)
		};

		context.state.template.push(`<${node.name}`);

		/** @type {Array<Attribute | SpreadAttribute>} */
		const attributes = [];

		/** @type {ClassDirective[]} */
		const class_directives = [];

		/** @type {StyleDirective[]} */
		const style_directives = [];

		/** @type {ExpressionStatement[]} */
		const lets = [];

		const is_custom_element = is_custom_element_node(node);
		let needs_input_reset = false;
		let needs_content_reset = false;

		/** @type {BindDirective | null} */
		let value_binding = null;

		/** If true, needs `__value` for inputs */
		let needs_special_value_handling = node.name === 'option' || node.name === 'select';
		let is_content_editable = false;
		let has_content_editable_binding = false;
		let img_might_be_lazy = false;
		let might_need_event_replaying = false;
		let has_direction_attribute = false;

		if (is_custom_element) {
			// cloneNode is faster, but it does not instantiate the underlying class of the
			// custom element until the template is connected to the dom, which would
			// cause problems when setting properties on the custom element.
			// Therefore we need to use importNode instead, which doesn't have this caveat.
			metadata.context.template_needs_import_node = true;
		}

		for (const attribute of node.attributes) {
			if (attribute.type === 'Attribute') {
				attributes.push(attribute);
				if (node.name === 'img' && attribute.name === 'loading') {
					img_might_be_lazy = true;
				}
				if (attribute.name === 'dir') {
					has_direction_attribute = true;
				}
				if (
					(attribute.name === 'value' || attribute.name === 'checked') &&
					!is_text_attribute(attribute)
				) {
					needs_input_reset = true;
					needs_content_reset = true;
				} else if (
					attribute.name === 'contenteditable' &&
					(attribute.value === true ||
						(is_text_attribute(attribute) && attribute.value[0].data === 'true'))
				) {
					is_content_editable = true;
				}
			} else if (attribute.type === 'SpreadAttribute') {
				attributes.push(attribute);
				needs_input_reset = true;
				needs_content_reset = true;
				if (LoadErrorElements.includes(node.name)) {
					might_need_event_replaying = true;
				}
			} else if (attribute.type === 'ClassDirective') {
				class_directives.push(attribute);
			} else if (attribute.type === 'StyleDirective') {
				style_directives.push(attribute);
			} else if (attribute.type === 'LetDirective') {
				lets.push(/** @type {ExpressionStatement} */ (context.visit(attribute)));
			} else {
				if (attribute.type === 'BindDirective') {
					if (attribute.name === 'group' || attribute.name === 'checked') {
						needs_special_value_handling = true;
						needs_input_reset = true;
					} else if (attribute.name === 'value') {
						value_binding = attribute;
						needs_content_reset = true;
						needs_input_reset = true;
					} else if (
						attribute.name === 'innerHTML' ||
						attribute.name === 'innerText' ||
						attribute.name === 'textContent'
					) {
						has_content_editable_binding = true;
					}
				} else if (attribute.type === 'UseDirective' && LoadErrorElements.includes(node.name)) {
					might_need_event_replaying = true;
				}
				context.visit(attribute);
			}
		}

		if (child_metadata.namespace === 'foreign') {
			// input/select etc could mean something completely different in foreign namespace, so don't special-case them
			needs_content_reset = false;
			needs_input_reset = false;
			needs_special_value_handling = false;
			value_binding = null;
		}

		if (is_content_editable && has_content_editable_binding) {
			child_metadata.bound_contenteditable = true;
		}

		if (needs_input_reset && node.name === 'input') {
			context.state.init.push(b.stmt(b.call('$.remove_input_defaults', context.state.node)));
		}

		if (needs_content_reset && node.name === 'textarea') {
			context.state.init.push(b.stmt(b.call('$.remove_textarea_child', context.state.node)));
		}

		if (value_binding !== null && node.name === 'select') {
			setup_select_synchronization(value_binding, context);
		}

		const node_id = context.state.node;

		// Let bindings first, they can be used on attributes
		context.state.init.push(...lets);

		// Then do attributes
		let is_attributes_reactive = false;
		if (node.metadata.has_spread) {
			if (node.name === 'img') {
				img_might_be_lazy = true;
			}
			serialize_element_spread_attributes(
				attributes,
				context,
				node,
				node_id,
				// If value binding exists, that one takes care of calling $.init_select
				value_binding === null && node.name === 'select' && child_metadata.namespace !== 'foreign'
			);
			is_attributes_reactive = true;
		} else {
			for (const attribute of /** @type {Attribute[]} */ (attributes)) {
				if (is_event_attribute(attribute)) {
					if (
						(attribute.name === 'onload' || attribute.name === 'onerror') &&
						LoadErrorElements.includes(node.name)
					) {
						might_need_event_replaying = true;
					}
					serialize_event_attribute(attribute, context);
					continue;
				}

				if (needs_special_value_handling && attribute.name === 'value') {
					serialize_element_special_value_attribute(node.name, node_id, attribute, context);
					continue;
				}

				if (
					attribute.name !== 'autofocus' &&
					(attribute.value === true || is_text_attribute(attribute))
				) {
					const name = get_attribute_name(node, attribute, context);
					const literal_value = /** @type {Literal} */ (
						serialize_attribute_value(attribute.value, context)[1]
					).value;
					if (name !== 'class' || literal_value) {
						// TODO namespace=foreign probably doesn't want to do template stuff at all and instead use programmatic methods
						// to create the elements it needs.
						context.state.template.push(
							` ${attribute.name}${
								DOMBooleanAttributes.includes(name) && literal_value === true
									? ''
									: `="${literal_value === true ? '' : escape_html(literal_value, true)}"`
							}`
						);
						continue;
					}
				}

				const is =
					is_custom_element && child_metadata.namespace !== 'foreign'
						? serialize_custom_element_attribute_update_assignment(node_id, attribute, context)
						: serialize_element_attribute_update_assignment(node, node_id, attribute, context);
				if (is) is_attributes_reactive = true;
			}
		}

		// Apply the src and loading attributes for <img> elements after the element is appended to the document
		if (img_might_be_lazy) {
			context.state.after_update.push(b.stmt(b.call('$.handle_lazy_img', node_id)));
		}

		// class/style directives must be applied last since they could override class/style attributes
		serialize_class_directives(class_directives, node_id, context, is_attributes_reactive);
		serialize_style_directives(style_directives, node_id, context, is_attributes_reactive);

		if (might_need_event_replaying) {
			context.state.after_update.push(b.stmt(b.call('$.replay_events', node_id)));
		}

		context.state.template.push('>');

		/** @type {SourceLocation[]} */
		const child_locations = [];

		/** @type {ComponentClientTransformState} */
		const state = {
			...context.state,
			metadata: child_metadata,
			locations: child_locations,
			scope: /** @type {Scope} */ (context.state.scopes.get(node.fragment)),
			preserve_whitespace:
				context.state.preserve_whitespace ||
				((node.name === 'pre' || node.name === 'textarea') &&
					child_metadata.namespace !== 'foreign')
		};

		const { hoisted, trimmed } = clean_nodes(
			node,
			node.fragment.nodes,
			context.path,
			child_metadata.namespace,
			state,
			node.name === 'script' || state.preserve_whitespace,
			state.options.preserveComments
		);

		/** Whether or not we need to wrap the children in `{...}` to avoid declaration conflicts */
		const has_declaration = node.fragment.nodes.some((node) => node.type === 'SnippetBlock');

		const child_state = has_declaration
			? { ...state, init: [], update: [], after_update: [] }
			: state;

		for (const node of hoisted) {
			context.visit(node, child_state);
		}

		/** @type {Expression} */
		let arg = context.state.node;

		// If `hydrate_node` is set inside the element, we need to reset it
		// after the element has been hydrated
		let needs_reset = trimmed.some((node) => node.type !== 'Text');

		// The same applies if it's a `<template>` element, since we need to
		// set the value of `hydrate_node` to `node.content`
		if (node.name === 'template') {
			needs_reset = true;

			arg = b.member(arg, b.id('content'));
			child_state.init.push(b.stmt(b.call('$.reset', arg)));
		}

		process_children(trimmed, () => b.call('$.child', arg), true, {
			...context,
			state: child_state
		});

		if (needs_reset) {
			child_state.init.push(b.stmt(b.call('$.reset', context.state.node)));
		}

		if (has_declaration) {
			context.state.init.push(
				b.block([
					...child_state.init,
					child_state.update.length > 0 ? serialize_render_stmt(child_state.update) : b.empty,
					...child_state.after_update
				])
			);
		}

		if (has_direction_attribute) {
			// This fixes an issue with Chromium where updates to text content within an element
			// does not update the direction when set to auto. If we just re-assign the dir, this fixes it.
			context.state.update.push(
				b.stmt(b.assignment('=', b.member(node_id, b.id('dir')), b.member(node_id, b.id('dir'))))
			);
		}

		if (child_locations.length > 0) {
			// @ts-expect-error
			location.push(child_locations);
		}

		if (!VoidElements.includes(node.name)) {
			context.state.template.push(`</${node.name}>`);
		}
	},
	SvelteElement(node, context) {
		context.state.template.push(`<!>`);

		/** @type {Array<Attribute | SpreadAttribute>} */
		const attributes = [];

		/** @type {Attribute['value'] | undefined} */
		let dynamic_namespace = undefined;

		/** @type {ClassDirective[]} */
		const class_directives = [];

		/** @type {StyleDirective[]} */
		const style_directives = [];

		/** @type {ExpressionStatement[]} */
		const lets = [];

		// Create a temporary context which picks up the init/update statements.
		// They'll then be added to the function parameter of $.element
		const element_id = b.id(context.state.scope.generate('$$element'));

		/** @type {ComponentContext} */
		const inner_context = {
			...context,
			state: {
				...context.state,
				node: element_id,
				before_init: [],
				init: [],
				update: [],
				after_update: []
			}
		};

		for (const attribute of node.attributes) {
			if (attribute.type === 'Attribute') {
				if (attribute.name === 'xmlns' && !is_text_attribute(attribute)) {
					dynamic_namespace = attribute.value;
				}
				attributes.push(attribute);
			} else if (attribute.type === 'SpreadAttribute') {
				attributes.push(attribute);
			} else if (attribute.type === 'ClassDirective') {
				class_directives.push(attribute);
			} else if (attribute.type === 'StyleDirective') {
				style_directives.push(attribute);
			} else if (attribute.type === 'LetDirective') {
				lets.push(/** @type {ExpressionStatement} */ (context.visit(attribute)));
			} else {
				context.visit(attribute, inner_context.state);
			}
		}

		// Let bindings first, they can be used on attributes
		context.state.init.push(...lets); // create computeds in the outer context; the dynamic element is the single child of this slot

		// Then do attributes
		// Always use spread because we don't know whether the element is a custom element or not,
		// therefore we need to do the "how to set an attribute" logic at runtime.
		const is_attributes_reactive =
			serialize_dynamic_element_attributes(attributes, inner_context, element_id) !== null;

		// class/style directives must be applied last since they could override class/style attributes
		serialize_class_directives(class_directives, element_id, inner_context, is_attributes_reactive);
		serialize_style_directives(style_directives, element_id, inner_context, is_attributes_reactive);

		const get_tag = b.thunk(/** @type {Expression} */ (context.visit(node.tag)));

		if (context.state.options.dev && context.state.metadata.namespace !== 'foreign') {
			if (node.fragment.nodes.length > 0) {
				context.state.init.push(b.stmt(b.call('$.validate_void_dynamic_element', get_tag)));
			}
			context.state.init.push(b.stmt(b.call('$.validate_dynamic_element_tag', get_tag)));
		}

		/** @type {Statement[]} */
		const inner = inner_context.state.init;
		if (inner_context.state.update.length > 0) {
			inner.push(serialize_render_stmt(inner_context.state.update));
		}
		inner.push(...inner_context.state.after_update);
		inner.push(
			.../** @type {BlockStatement} */ (
				context.visit(node.fragment, {
					...context.state,
					metadata: {
						...context.state.metadata,
						namespace: determine_namespace_for_children(node, context.state.metadata.namespace)
					}
				})
			).body
		);

		const location = context.state.options.dev && locator(node.start);

		context.state.init.push(
			b.stmt(
				b.call(
					'$.element',
					context.state.node,
					get_tag,
					node.metadata.svg || node.metadata.mathml ? b.true : b.false,
					inner.length > 0 && b.arrow([element_id, b.id('$$anchor')], b.block(inner)),
					dynamic_namespace && b.thunk(serialize_attribute_value(dynamic_namespace, context)[1]),
					location && b.array([b.literal(location.line), b.literal(location.column)])
				)
			)
		);
	},
	EachBlock(node, context) {
		const each_node_meta = node.metadata;
		const collection = /** @type {Expression} */ (context.visit(node.expression));

		if (!each_node_meta.is_controlled) {
			context.state.template.push('<!>');
		}

		if (each_node_meta.array_name !== null) {
			context.state.init.push(b.const(each_node_meta.array_name, b.thunk(collection)));
		}

		let flags = 0;

		if (
			node.key &&
			(node.key.type !== 'Identifier' || !node.index || node.key.name !== node.index)
		) {
			flags |= EACH_KEYED;

			if (node.index) {
				flags |= EACH_INDEX_REACTIVE;
			}

			// In runes mode, if key === item, we don't need to wrap the item in a source
			const key_is_item =
				node.key.type === 'Identifier' &&
				node.context.type === 'Identifier' &&
				node.context.name === node.key.name;

			if (!context.state.analysis.runes || !key_is_item) {
				flags |= EACH_ITEM_REACTIVE;
			}
		} else {
			flags |= EACH_ITEM_REACTIVE;
		}

		// Since `animate:` can only appear on elements that are the sole child of a keyed each block,
		// we can determine at compile time whether the each block is animated or not (in which
		// case it should measure animated elements before and after reconciliation).
		if (
			node.key &&
			node.body.nodes.some((child) => {
				if (child.type !== 'RegularElement' && child.type !== 'SvelteElement') return false;
				return child.attributes.some((attr) => attr.type === 'AnimateDirective');
			})
		) {
			flags |= EACH_IS_ANIMATED;
		}

		if (each_node_meta.is_controlled) {
			flags |= EACH_IS_CONTROLLED;
		}

		if (context.state.analysis.runes) {
			flags |= EACH_IS_STRICT_EQUALS;
		}

		// If the array is a store expression, we need to invalidate it when the array is changed.
		// This doesn't catch all cases, but all the ones that Svelte 4 catches, too.
		let store_to_invalidate = '';
		if (node.expression.type === 'Identifier' || node.expression.type === 'MemberExpression') {
			const id = object(node.expression);
			if (id) {
				const binding = context.state.scope.get(id.name);
				if (binding?.kind === 'store_sub') {
					store_to_invalidate = id.name;
				}
			}
		}

		// Legacy mode: find the parent each blocks which contain the arrays to invalidate
		const indirect_dependencies = collect_parent_each_blocks(context).flatMap((block) => {
			const array = /** @type {Expression} */ (context.visit(block.expression));
			const transitive_dependencies = serialize_transitive_dependencies(
				block.metadata.references,
				context
			);
			return [array, ...transitive_dependencies];
		});

		if (each_node_meta.array_name) {
			indirect_dependencies.push(b.call(each_node_meta.array_name));
		} else {
			indirect_dependencies.push(collection);

			const transitive_dependencies = serialize_transitive_dependencies(
				each_node_meta.references,
				context
			);
			indirect_dependencies.push(...transitive_dependencies);
		}

		const child_state = {
			...context.state,
			getters: { ...context.state.getters }
		};

		/**
		 * @param {Pattern} expression_for_id
		 * @returns {Binding['mutation']}
		 */
		const create_mutation = (expression_for_id) => {
			return (assignment, context) => {
				if (assignment.left.type !== 'Identifier' && assignment.left.type !== 'MemberExpression') {
					// serialize_set_binding turns other patterns into IIFEs and separates the assignments
					// into separate expressions, at which point this is called again with an identifier or member expression
					return serialize_set_binding(assignment, context, () => assignment);
				}

				const left = object(assignment.left);
				const value = get_assignment_value(assignment, context);
				const invalidate = b.call(
					'$.invalidate_inner_signals',
					b.thunk(b.sequence(indirect_dependencies))
				);
				const invalidate_store = store_to_invalidate
					? b.call('$.invalidate_store', b.id('$$stores'), b.literal(store_to_invalidate))
					: undefined;

				const sequence = [];
				if (!context.state.analysis.runes) sequence.push(invalidate);
				if (invalidate_store) sequence.push(invalidate_store);

				if (left === assignment.left) {
					const assign = b.assignment('=', expression_for_id, value);
					sequence.unshift(assign);
					return b.sequence(sequence);
				} else {
					const original_left = /** @type {MemberExpression} */ (assignment.left);
					const left = context.visit(original_left);
					const assign = b.assignment(assignment.operator, left, value);
					sequence.unshift(assign);
					return b.sequence(sequence);
				}
			};
		};

		// We need to generate a unique identifier in case there's a bind:group below
		// which needs a reference to the index
		const index =
			each_node_meta.contains_group_binding || !node.index
				? each_node_meta.index
				: b.id(node.index);
		const item = each_node_meta.item;
		const binding = /** @type {Binding} */ (context.state.scope.get(item.name));
		const getter = (/** @type {Identifier} */ id) => {
			const item_with_loc = with_loc(item, id);
			return b.call('$.unwrap', item_with_loc);
		};
		child_state.getters[item.name] = getter;

		if (node.index) {
			child_state.getters[node.index] = (id) => {
				const index_with_loc = with_loc(index, id);
				return b.call('$.unwrap', index_with_loc);
			};
		}

		/** @type {Statement[]} */
		const declarations = [];

		if (node.context.type === 'Identifier') {
			binding.mutation = create_mutation(
				b.member(
					each_node_meta.array_name ? b.call(each_node_meta.array_name) : collection,
					index,
					true
				)
			);
		} else {
			const unwrapped = getter(binding.node);
			const paths = extract_paths(node.context);

			for (const path of paths) {
				const name = /** @type {Identifier} */ (path.node).name;
				const binding = /** @type {Binding} */ (context.state.scope.get(name));
				const needs_derived = path.has_default_value; // to ensure that default value is only called once
				const fn = b.thunk(
					/** @type {Expression} */ (context.visit(path.expression?.(unwrapped), child_state))
				);

				declarations.push(
					b.let(path.node, needs_derived ? b.call('$.derived_safe_equal', fn) : fn)
				);

				const getter = needs_derived ? b.call('$.get', b.id(name)) : b.call(name);
				child_state.getters[name] = getter;
				binding.mutation = create_mutation(
					/** @type {Pattern} */ (path.update_expression(unwrapped))
				);

				// we need to eagerly evaluate the expression in order to hit any
				// 'Cannot access x before initialization' errors
				if (context.state.options.dev) {
					declarations.push(b.stmt(getter));
				}
			}
		}

		const block = /** @type {BlockStatement} */ (context.visit(node.body, child_state));

		const key_function = node.key
			? b.arrow(
					[node.context.type === 'Identifier' ? node.context : b.id('$$item'), index],
					declarations.length > 0
						? b.block(
								declarations.concat(
									b.return(/** @type {Expression} */ (context.visit(node.key, child_state)))
								)
							)
						: /** @type {Expression} */ (context.visit(node.key, child_state))
				)
			: b.id('$.index');

		if (node.index && each_node_meta.contains_group_binding) {
			// We needed to create a unique identifier for the index above, but we want to use the
			// original index name in the template, therefore create another binding
			declarations.push(b.let(node.index, index));
		}

		if (context.state.options.dev && (flags & EACH_KEYED) !== 0) {
			context.state.init.push(
				b.stmt(b.call('$.validate_each_keys', b.thunk(collection), key_function))
			);
		}

		/** @type {Expression[]} */
		const args = [
			context.state.node,
			b.literal(flags),
			each_node_meta.array_name ? each_node_meta.array_name : b.thunk(collection),
			key_function,
			b.arrow([b.id('$$anchor'), item, index], b.block(declarations.concat(block.body)))
		];

		if (node.fallback) {
			args.push(
				b.arrow([b.id('$$anchor')], /** @type {BlockStatement} */ (context.visit(node.fallback)))
			);
		}

		context.state.init.push(b.stmt(b.call('$.each', ...args)));
	},
	IfBlock(node, context) {
		context.state.template.push('<!>');

		const consequent = /** @type {BlockStatement} */ (context.visit(node.consequent));

		const args = [
			context.state.node,
			b.thunk(/** @type {Expression} */ (context.visit(node.test))),
			b.arrow([b.id('$$anchor')], consequent)
		];

		if (node.alternate || node.elseif) {
			args.push(
				node.alternate
					? b.arrow(
							[b.id('$$anchor')],
							/** @type {BlockStatement} */ (context.visit(node.alternate))
						)
					: b.literal(null)
			);
		}

		if (node.elseif) {
			// We treat this...
			//
			//   {#if x}
			//     ...
			//   {:else}
			//     {#if y}
			//       <div transition:foo>...</div>
			//     {/if}
			//   {/if}
			//
			// ...slightly differently to this...
			//
			//   {#if x}
			//     ...
			//   {:else if y}
			//     <div transition:foo>...</div>
			//   {/if}
			//
			// ...even though they're logically equivalent. In the first case, the
			// transition will only play when `y` changes, but in the second it
			// should play when `x` or `y` change — both are considered 'local'
			args.push(b.literal(true));
		}

		context.state.init.push(b.stmt(b.call('$.if', ...args)));
	},
	AwaitBlock(node, context) {
		context.state.template.push('<!>');

		let then_block;
		let catch_block;

		if (node.then) {
			/** @type {Pattern[]} */
			const args = [b.id('$$anchor')];
			const block = /** @type {BlockStatement} */ (context.visit(node.then));

			if (node.value) {
				const argument = create_derived_block_argument(node.value, context);

				args.push(argument.id);

				if (argument.declarations !== null) {
					block.body.unshift(...argument.declarations);
				}
			}

			then_block = b.arrow(args, block);
		}

		if (node.catch) {
			/** @type {Pattern[]} */
			const args = [b.id('$$anchor')];
			const block = /** @type {BlockStatement} */ (context.visit(node.catch));

			if (node.error) {
				const argument = create_derived_block_argument(node.error, context);

				args.push(argument.id);

				if (argument.declarations !== null) {
					block.body.unshift(...argument.declarations);
				}
			}

			catch_block = b.arrow(args, block);
		}

		context.state.init.push(
			b.stmt(
				b.call(
					'$.await',
					context.state.node,
					b.thunk(/** @type {Expression} */ (context.visit(node.expression))),
					node.pending
						? b.arrow(
								[b.id('$$anchor')],
								/** @type {BlockStatement} */ (context.visit(node.pending))
							)
						: b.literal(null),
					then_block,
					catch_block
				)
			)
		);
	},
	KeyBlock(node, context) {
		context.state.template.push('<!>');
		const key = /** @type {Expression} */ (context.visit(node.expression));
		const body = /** @type {Expression} */ (context.visit(node.fragment));
		context.state.init.push(
			b.stmt(b.call('$.key', context.state.node, b.thunk(key), b.arrow([b.id('$$anchor')], body)))
		);
	},
	SnippetBlock(node, context) {
		// TODO hoist where possible
		/** @type {Pattern[]} */
		const args = [b.id('$$anchor')];

		/** @type {BlockStatement} */
		let body;

		/** @type {Statement[]} */
		const declarations = [];

		const getters = { ...context.state.getters };
		const child_state = { ...context.state, getters };

		for (let i = 0; i < node.parameters.length; i++) {
			const argument = node.parameters[i];

			if (!argument) continue;

			if (argument.type === 'Identifier') {
				args.push({
					type: 'AssignmentPattern',
					left: argument,
					right: b.id('$.noop')
				});

				getters[argument.name] = b.call(argument);
				continue;
			}

			let arg_alias = `$$arg${i}`;
			args.push(b.id(arg_alias));

			const paths = extract_paths(argument);

			for (const path of paths) {
				const name = /** @type {Identifier} */ (path.node).name;
				const binding = /** @type {Binding} */ (context.state.scope.get(name));
				const needs_derived = path.has_default_value; // to ensure that default value is only called once
				const fn = b.thunk(
					/** @type {Expression} */ (
						context.visit(path.expression?.(b.maybe_call(b.id(arg_alias))))
					)
				);

				declarations.push(
					b.let(path.node, needs_derived ? b.call('$.derived_safe_equal', fn) : fn)
				);

				getters[name] = needs_derived ? b.call('$.get', b.id(name)) : b.call(name);

				// we need to eagerly evaluate the expression in order to hit any
				// 'Cannot access x before initialization' errors
				if (context.state.options.dev) {
					declarations.push(b.stmt(getters[name]));
				}
			}
		}

		body = b.block([
			...declarations,
			.../** @type {BlockStatement} */ (context.visit(node.body, child_state)).body
		]);

		/** @type {Expression} */
		let snippet = b.arrow(args, body);

		if (context.state.options.dev) {
			snippet = b.call('$.wrap_snippet', b.id(context.state.analysis.name), snippet);
		}

		const declaration = b.const(node.expression, snippet);

		// Top-level snippets are hoisted so they can be referenced in the `<script>`
		if (context.path.length === 1 && context.path[0].type === 'Fragment') {
			context.state.analysis.top_level_snippets.push(declaration);
		} else {
			context.state.init.push(declaration);
		}
	},
	FunctionExpression: function_visitor,
	ArrowFunctionExpression: function_visitor,
	FunctionDeclaration(node, context) {
		context.next({ ...context.state, in_constructor: false });
	},
	OnDirective(node, context) {
		serialize_event(node, node.metadata, context);
	},
	UseDirective(node, { state, next, visit }) {
		const params = [b.id('$$node')];

		if (node.expression) {
			params.push(b.id('$$action_arg'));
		}

		/** @type {Expression[]} */
		const args = [
			state.node,
			b.arrow(
				params,
				b.call(/** @type {Expression} */ (visit(parse_directive_name(node.name))), ...params)
			)
		];

		if (node.expression) {
			args.push(b.thunk(/** @type {Expression} */ (visit(node.expression))));
		}

		// actions need to run after attribute updates in order with bindings/events
		state.after_update.push(b.stmt(b.call('$.action', ...args)));
		next();
	},
	BindDirective(node, context) {
		const { state, path, visit } = context;
		const expression = node.expression;
		const property = binding_properties[node.name];

		// serialize_validate_binding will add a function that specifically throw
		// `binding_property_non_reactive` error. If there's a svelte ignore
		// before we avoid adding this validation to avoid throwing the runtime warning
		const to_ignore = ignore_map
			.get(node)
			?.some((code) => code.has('binding_property_non_reactive'));

		if (
			expression.type === 'MemberExpression' &&
			(node.name !== 'this' ||
				path.some(
					({ type }) =>
						type === 'IfBlock' ||
						type === 'EachBlock' ||
						type === 'AwaitBlock' ||
						type === 'KeyBlock'
				)) &&
			context.state.options.dev &&
			context.state.analysis.runes &&
			!to_ignore
		) {
			context.state.init.push(
				serialize_validate_binding(
					context.state,
					node,
					/**@type {MemberExpression} */ (visit(expression))
				)
			);
		}

		const getter = b.thunk(/** @type {Expression} */ (visit(expression)));
		const assignment = b.assignment('=', expression, b.id('$$value'));
		const setter = b.arrow(
			[b.id('$$value')],
			serialize_set_binding(
				assignment,
				context,
				() => /** @type {Expression} */ (visit(assignment)),
				null,
				{
					skip_proxy_and_freeze: true
				}
			)
		);

		/** @type {CallExpression} */
		let call_expr;

		if (property?.event) {
			call_expr = b.call(
				'$.bind_property',
				b.literal(node.name),
				b.literal(property.event),
				state.node,
				setter,
				property.bidirectional && getter
			);
		} else {
			// special cases
			switch (node.name) {
				// window
				case 'online':
					call_expr = b.call(`$.bind_online`, setter);
					break;

				case 'scrollX':
				case 'scrollY':
					call_expr = b.call(
						'$.bind_window_scroll',
						b.literal(node.name === 'scrollX' ? 'x' : 'y'),
						getter,
						setter
					);
					break;

				case 'innerWidth':
				case 'innerHeight':
				case 'outerWidth':
				case 'outerHeight':
					call_expr = b.call('$.bind_window_size', b.literal(node.name), setter);
					break;

				// document
				case 'activeElement':
					call_expr = b.call('$.bind_active_element', setter);
					break;

				// media
				case 'muted':
					call_expr = b.call(`$.bind_muted`, state.node, getter, setter);
					break;
				case 'paused':
					call_expr = b.call(`$.bind_paused`, state.node, getter, setter);
					break;
				case 'volume':
					call_expr = b.call(`$.bind_volume`, state.node, getter, setter);
					break;
				case 'playbackRate':
					call_expr = b.call(`$.bind_playback_rate`, state.node, getter, setter);
					break;
				case 'currentTime':
					call_expr = b.call(`$.bind_current_time`, state.node, getter, setter);
					break;
				case 'buffered':
					call_expr = b.call(`$.bind_buffered`, state.node, setter);
					break;
				case 'played':
					call_expr = b.call(`$.bind_played`, state.node, setter);
					break;
				case 'seekable':
					call_expr = b.call(`$.bind_seekable`, state.node, setter);
					break;
				case 'seeking':
					call_expr = b.call(`$.bind_seeking`, state.node, setter);
					break;
				case 'ended':
					call_expr = b.call(`$.bind_ended`, state.node, setter);
					break;
				case 'readyState':
					call_expr = b.call(`$.bind_ready_state`, state.node, setter);
					break;

				// dimensions
				case 'contentRect':
				case 'contentBoxSize':
				case 'borderBoxSize':
				case 'devicePixelContentBoxSize':
					call_expr = b.call('$.bind_resize_observer', state.node, b.literal(node.name), setter);
					break;

				case 'clientWidth':
				case 'clientHeight':
				case 'offsetWidth':
				case 'offsetHeight':
					call_expr = b.call('$.bind_element_size', state.node, b.literal(node.name), setter);
					break;

				// various
				case 'value': {
					const parent = path.at(-1);
					if (parent?.type === 'RegularElement' && parent.name === 'select') {
						call_expr = b.call(`$.bind_select_value`, state.node, getter, setter);
					} else {
						call_expr = b.call(`$.bind_value`, state.node, getter, setter);
					}
					break;
				}

				case 'files':
					call_expr = b.call(`$.bind_files`, state.node, getter, setter);
					break;

				case 'this':
					call_expr = serialize_bind_this(node.expression, state.node, context);
					break;
				case 'textContent':
				case 'innerHTML':
				case 'innerText':
					call_expr = b.call(
						'$.bind_content_editable',
						b.literal(node.name),
						state.node,
						getter,
						setter
					);
					break;

				// checkbox/radio
				case 'checked':
					call_expr = b.call(`$.bind_checked`, state.node, getter, setter);
					break;
				case 'focused':
					call_expr = b.call(`$.bind_focused`, state.node, setter);
					break;
				case 'group': {
					/** @type {CallExpression[]} */
					const indexes = [];
					for (const parent_each_block of node.metadata.parent_each_blocks) {
						indexes.push(b.call('$.unwrap', parent_each_block.metadata.index));
					}

					// We need to additionally invoke the value attribute signal to register it as a dependency,
					// so that when the value is updated, the group binding is updated
					let group_getter = getter;
					const parent = path.at(-1);
					if (parent?.type === 'RegularElement') {
						const value = /** @type {any[]} */ (
							/** @type {Attribute} */ (
								parent.attributes.find(
									(a) =>
										a.type === 'Attribute' &&
										a.name === 'value' &&
										!is_text_attribute(a) &&
										a.value !== true
								)
							)?.value
						);
						if (value !== undefined) {
							group_getter = b.thunk(
								b.block([
									b.stmt(serialize_attribute_value(value, context)[1]),
									b.return(/** @type {Expression} */ (visit(expression)))
								])
							);
						}
					}

					call_expr = b.call(
						'$.bind_group',
						node.metadata.binding_group_name,
						b.array(indexes),
						state.node,
						group_getter,
						setter
					);
					break;
				}

				default:
					throw new Error('unknown binding ' + node.name);
			}
		}

		const parent = /** @type {import('#compiler').SvelteNode} */ (context.path.at(-1));
		const has_action_directive =
			parent.type === 'RegularElement' && parent.attributes.find((a) => a.type === 'UseDirective');

		// Bindings need to happen after attribute updates, therefore after the render effect, and in order with events/actions.
		// bind:this is a special case as it's one-way and could influence the render effect.
		if (node.name === 'this') {
			state.init.push(
				b.stmt(has_action_directive ? b.call('$.effect', b.thunk(call_expr)) : call_expr)
			);
		} else {
			state.after_update.push(
				b.stmt(has_action_directive ? b.call('$.effect', b.thunk(call_expr)) : call_expr)
			);
		}
	},
	Component(node, context) {
		if (node.metadata.dynamic) {
			// Handle dynamic references to what seems like static inline components
			const component = serialize_inline_component(node, '$$component', context, b.id('$$anchor'));
			context.state.init.push(
				b.stmt(
					b.call(
						'$.component',
						context.state.node,
						// TODO use untrack here to not update when binding changes?
						// Would align with Svelte 4 behavior, but it's arguably nicer/expected to update this
						b.thunk(/** @type {Expression} */ (context.visit(b.member_id(node.name)))),
						b.arrow([b.id('$$anchor'), b.id('$$component')], b.block([component]))
					)
				)
			);
			return;
		}

		const component = serialize_inline_component(node, node.name, context);
		context.state.init.push(component);
	},
	SvelteSelf(node, context) {
		const component = serialize_inline_component(node, context.state.analysis.name, context);
		context.state.init.push(component);
	},
	SvelteComponent(node, context) {
		let component = serialize_inline_component(node, '$$component', context);

		context.state.init.push(component);
	},
	Attribute(node, context) {
		if (is_event_attribute(node)) {
			serialize_event_attribute(node, context);
		}
	},
	LetDirective(node, { state }) {
		// let:x        -->  const x = $.derived(() => $$slotProps.x);
		// let:x={{y, z}}  -->  const derived_x = $.derived(() => { const { y, z } = $$slotProps.x; return { y, z }));
		if (node.expression && node.expression.type !== 'Identifier') {
			const name = state.scope.generate(node.name);
			const bindings = state.scope.get_bindings(node);

			for (const binding of bindings) {
				state.getters[binding.node.name] = b.member(
					b.call('$.get', b.id(name)),
					b.id(binding.node.name)
				);
			}

			return b.const(
				name,
				b.call(
					'$.derived',
					b.thunk(
						b.block([
							b.let(
								/** @type {Expression} */ (node.expression).type === 'ObjectExpression'
									? // @ts-expect-error types don't match, but it can't contain spread elements and the structure is otherwise fine
										b.object_pattern(node.expression.properties)
									: // @ts-expect-error types don't match, but it can't contain spread elements and the structure is otherwise fine
										b.array_pattern(node.expression.elements),
								b.member(b.id('$$slotProps'), b.id(node.name))
							),
							b.return(b.object(bindings.map((binding) => b.init(binding.node.name, binding.node))))
						])
					)
				)
			);
		} else {
			const name = node.expression === null ? node.name : node.expression.name;
			return b.const(
				name,
				create_derived(state, b.thunk(b.member(b.id('$$slotProps'), b.id(node.name))))
			);
		}
	},
	SpreadAttribute(node, { visit }) {
		return visit(node.expression);
	},
	SvelteFragment(node, context) {
		/** @type {Statement[]} */
		const lets = [];

		for (const attribute of node.attributes) {
			if (attribute.type === 'LetDirective') {
				lets.push(/** @type {ExpressionStatement} */ (context.visit(attribute)));
			}
		}

		context.state.init.push(...lets);
		context.state.init.push(.../** @type {BlockStatement} */ (context.visit(node.fragment)).body);
	},
	SlotElement(node, context) {
		// <slot {a}>fallback</slot>  -->   $.slot($$slots.default, { get a() { .. } }, () => ...fallback);
		context.state.template.push('<!>');

		/** @type {Property[]} */
		const props = [];

		/** @type {Expression[]} */
		const spreads = [];

		/** @type {ExpressionStatement[]} */
		const lets = [];

		let is_default = true;

		/** @type {Expression} */
		let name = b.literal('default');

		for (const attribute of node.attributes) {
			if (attribute.type === 'SpreadAttribute') {
				spreads.push(b.thunk(/** @type {Expression} */ (context.visit(attribute))));
			} else if (attribute.type === 'Attribute') {
				const [, value] = serialize_attribute_value(attribute.value, context);
				if (attribute.name === 'name') {
					name = value;
					is_default = false;
				} else if (attribute.name !== 'slot') {
					if (attribute.metadata.dynamic) {
						props.push(b.get(attribute.name, [b.return(value)]));
					} else {
						props.push(b.init(attribute.name, value));
					}
				}
			} else if (attribute.type === 'LetDirective') {
				lets.push(/** @type {ExpressionStatement} */ (context.visit(attribute)));
			}
		}

		// Let bindings first, they can be used on attributes
		context.state.init.push(...lets);

		const props_expression =
			spreads.length === 0
				? b.object(props)
				: b.call('$.spread_props', b.object(props), ...spreads);

		const fallback =
			node.fragment.nodes.length === 0
				? b.literal(null)
				: b.arrow([b.id('$$anchor')], /** @type {BlockStatement} */ (context.visit(node.fragment)));

		const expression = is_default
			? b.call('$.default_slot', b.id('$$props'))
			: b.member(b.member(b.id('$$props'), b.id('$$slots')), name, true, true);

		const slot = b.call('$.slot', context.state.node, expression, props_expression, fallback);
		context.state.init.push(b.stmt(slot));
	},
	SvelteHead(node, context) {
		// TODO attributes?
		context.state.init.push(
			b.stmt(
				b.call(
					'$.head',
					b.arrow([b.id('$$anchor')], /** @type {BlockStatement} */ (context.visit(node.fragment)))
				)
			)
		);
	},
	TitleElement(node, { state, visit }) {
		// TODO throw validation error when attributes present / when children something else than text/expression tags
		if (node.fragment.nodes.length === 1 && node.fragment.nodes[0].type === 'Text') {
			state.init.push(
				b.stmt(
					b.assignment(
						'=',
						b.member(b.id('$.document'), b.id('title')),
						b.literal(/** @type {Text} */ (node.fragment.nodes[0]).data)
					)
				)
			);
		} else {
			state.update.push(
				b.stmt(
					b.assignment(
						'=',
						b.member(b.id('$.document'), b.id('title')),
						serialize_template_literal(/** @type {any} */ (node.fragment.nodes), visit, state)[1]
					)
				)
			);
		}
	},
	SvelteBody(node, context) {
		context.next({
			...context.state,
			node: b.id('$.document.body')
		});
	},
	SvelteWindow(node, context) {
		context.next({
			...context.state,
			node: b.id('$.window')
		});
	},
	SvelteDocument(node, context) {
		context.next({
			...context.state,
			node: b.id('$.document')
		});
	},
	CallExpression: javascript_visitors_runes.CallExpression,
	VariableDeclaration: javascript_visitors_runes.VariableDeclaration
};

/**
 * @param {ComponentClientTransformState} state
 * @param {BindDirective} binding
 * @param {MemberExpression} expression
 */
function serialize_validate_binding(state, binding, expression) {
	const string = state.analysis.source.slice(binding.start, binding.end);

	const get_object = b.thunk(/** @type {Expression} */ (expression.object));
	const get_property = b.thunk(
		/** @type {Expression} */ (
			expression.computed
				? expression.property
				: b.literal(/** @type {Identifier} */ (expression.property).name)
		)
	);

	const loc = locator(binding.start);

	return b.stmt(
		b.call(
			'$.validate_binding',
			b.literal(string),
			get_object,
			get_property,
			loc && b.literal(loc.line),
			loc && b.literal(loc.column)
		)
	);
}
