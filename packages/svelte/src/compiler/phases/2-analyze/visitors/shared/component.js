/** @import { AST } from '#compiler' */
/** @import { Expression } from 'estree' */
/** @import { AnalysisState, Context } from '../../types' */
import * as e from '../../../../errors.js';
import { get_attribute_expression, is_expression_attribute } from '../../../../utils/ast.js';
import { determine_slot } from '../../../../utils/slot.js';
import {
	validate_attribute,
	validate_attribute_name,
	validate_slot_attribute
} from './attribute.js';
import { mark_subtree_dynamic } from './fragment.js';

/**
 * @param {AST.Component | AST.SvelteComponent | AST.SvelteSelf} node
 * @param {Context} context
 */
export function visit_component(node, context) {
	node.metadata.path = [...context.path];

	// link this node to all the snippets that it could render, so that we can prune CSS correctly
	node.metadata.snippets = new Set();

	let resolved = true;

	for (const attribute of node.attributes) {
		/** @type {Expression | undefined} */
		let expression;

		if (attribute.type === 'SpreadAttribute' || attribute.type === 'BindDirective') {
			resolved = false;
			continue;
		}

		if (attribute.type !== 'Attribute' || attribute.value === true) {
			continue;
		}

		if (Array.isArray(attribute.value)) {
			if (attribute.value.length === 1 && attribute.value[0].type === 'ExpressionTag') {
				expression = attribute.value[0].expression;
			}
		} else {
			expression = attribute.value.expression;
		}

		if (!expression) continue;

		if (expression.type === 'Identifier') {
			const binding = context.state.scope.get(expression.name);

			if (
				binding &&
				binding.declaration_kind !== 'import' &&
				binding.kind !== 'prop' &&
				binding.kind !== 'rest_prop' &&
				binding.kind !== 'bindable_prop' &&
				binding.initial?.type !== 'SnippetBlock'
			) {
				resolved = false;
			}

			if (binding?.initial?.type === 'SnippetBlock') {
				node.metadata.snippets.add(binding.initial);
			}
		} else {
			// we can't safely know which snippets this component could render,
			// so we deopt. this _could_ result in unused CSS not being discarded
			resolved = false;
		}
	}

	if (resolved) {
		for (const child of node.fragment.nodes) {
			if (child.type === 'SnippetBlock') {
				node.metadata.snippets.add(child);
			}
		}
	}

	context.state.analysis.snippet_renderers.set(node, resolved);

	mark_subtree_dynamic(context.path);

	for (const attribute of node.attributes) {
		if (
			attribute.type !== 'Attribute' &&
			attribute.type !== 'SpreadAttribute' &&
			attribute.type !== 'LetDirective' &&
			attribute.type !== 'OnDirective' &&
			attribute.type !== 'BindDirective'
		) {
			e.component_invalid_directive(attribute);
		}

		if (
			attribute.type === 'OnDirective' &&
			(attribute.modifiers.length > 1 || attribute.modifiers.some((m) => m !== 'once'))
		) {
			e.event_handler_invalid_component_modifier(attribute);
		}

		if (attribute.type === 'Attribute') {
			if (context.state.analysis.runes) {
				validate_attribute(attribute, node);

				if (is_expression_attribute(attribute)) {
					const expression = get_attribute_expression(attribute);
					if (expression.type === 'SequenceExpression') {
						let i = /** @type {number} */ (expression.start);
						while (--i > 0) {
							const char = context.state.analysis.source[i];
							if (char === '(') break; // parenthesized sequence expressions are ok
							if (char === '{') e.attribute_invalid_sequence_expression(expression);
						}
					}
				}
			}

			validate_attribute_name(attribute);

			if (attribute.name === 'slot') {
				validate_slot_attribute(context, attribute, true);
			}
		}

		if (attribute.type === 'BindDirective' && attribute.name !== 'this') {
			context.state.analysis.uses_component_bindings = true;
		}
	}

	// If the component has a slot attribute — `<Foo slot="whatever" .../>` —
	// then `let:` directives apply to other attributes, instead of just the
	// top-level contents of the component. Yes, this is very weird.
	const default_state = determine_slot(node)
		? context.state
		: { ...context.state, scope: node.metadata.scopes.default };

	for (const attribute of node.attributes) {
		context.visit(attribute, attribute.type === 'LetDirective' ? default_state : context.state);
	}

	/** @type {AST.Comment[]} */
	let comments = [];

	/** @type {Record<string, AST.Fragment['nodes']>} */
	const nodes = { default: [] };

	for (const child of node.fragment.nodes) {
		if (child.type === 'Comment') {
			comments.push(child);
			continue;
		}

		const slot_name = determine_slot(child) ?? 'default';
		(nodes[slot_name] ??= []).push(...comments, child);

		if (slot_name !== 'default') comments = [];
	}

	const component_slots = new Set();

	for (const slot_name in nodes) {
		/** @type {AnalysisState} */
		const state = {
			...context.state,
			scope: node.metadata.scopes[slot_name],
			parent_element: null,
			component_slots
		};

		context.visit({ ...node.fragment, nodes: nodes[slot_name] }, state);
	}
}
