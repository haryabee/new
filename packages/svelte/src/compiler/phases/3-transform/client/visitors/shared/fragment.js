/** @import { Expression } from 'estree' */
/** @import { ExpressionTag, SvelteNode, Text } from '#compiler' */
/** @import { ComponentClientTransformState, ComponentContext } from '../../types' */
import { is_event_attribute, is_text_attribute } from '../../../../../utils/ast.js';
import * as b from '../../../../../utils/builders.js';
import { build_template_literal, build_update } from './utils.js';

/**
 * Processes an array of template nodes, joining sibling text/expression nodes
 * (e.g. `{a} b {c}`) into a single update function. Along the way it creates
 * corresponding template node references these updates are applied to.
 * @param {SvelteNode[]} nodes
 * @param {(is_text: boolean) => Expression} initial
 * @param {boolean} is_element
 * @param {ComponentContext} context
 */
export function process_children(nodes, initial, is_element, { visit, state }) {
	let prev = initial;

	const within_bound_contenteditable = state.metadata.bound_contenteditable;

	/** @typedef {Array<Text | ExpressionTag>} Sequence */

	/** @type {Sequence} */
	let sequence = [];

	let skipped = 0;

	/** @param {boolean} check */
	function get_node(check) {
		if (skipped === 0) {
			return prev(check);
		}

		return b.call(
			'$.sibling',
			prev(false),
			(check || skipped !== 1) && b.literal(skipped),
			check && b.true
		);
	}

	/**
	 * @param {boolean} check
	 * @param {string} name
	 */
	function flush_node(check, name) {
		const expression = get_node(check);
		let id = expression;

		if (id.type !== 'Identifier') {
			id = b.id(state.scope.generate(name));
			state.init.push(b.var(id, expression));
		}

		prev = () => id;
		skipped = 1;

		return id;
	}

	/**
	 * @param {Sequence} sequence
	 */
	function flush_sequence(sequence) {
		if (sequence.length === 1 && sequence[0].type === 'Text') {
			skipped += 1;
			state.template.push(sequence[0].raw);
			return;
		}

		state.template.push(' ');

		const { has_state, has_call, value } = build_template_literal(sequence, visit, state);

		// if this is a standalone `{expression}`, make sure we handle the case where
		// no text node was created because the expression was empty during SSR
		const needs_hydration_check = sequence.length === 1;
		const id = flush_node(needs_hydration_check, 'text');

		if (within_bound_contenteditable || !has_state) {
			state.init.push(b.stmt(b.assignment('=', b.member(id, 'nodeValue'), value)));
		} else {
			const update = b.stmt(b.call('$.set_text', id, value));

			if (has_call && !within_bound_contenteditable) {
				state.init.push(build_update(update));
			} else if (has_state && !within_bound_contenteditable) {
				state.update.push(update);
			}
		}
	}

	for (const node of nodes) {
		if (node.type === 'Text' || node.type === 'ExpressionTag') {
			sequence.push(node);
		} else {
			if (sequence.length > 0) {
				flush_sequence(sequence);
				sequence = [];
			}

			let child_state = state;

			if (is_static_element(node)) {
				skipped += 1;
			} else if (node.type === 'EachBlock' && nodes.length === 1 && is_element) {
				node.metadata.is_controlled = true;
			} else {
				const id = flush_node(false, node.type === 'RegularElement' ? node.name : 'node');
				child_state = { ...state, node: id };
			}

			visit(node, child_state);
		}
	}

	if (sequence.length > 0) {
		flush_sequence(sequence);
	}

	if (skipped > 1) {
		skipped -= 1;
		state.init.push(b.stmt(get_node(false)));
	}
}

/**
 *
 * @param {SvelteNode} node
 */
function is_static_element(node) {
	if (node.type !== 'RegularElement') return false;
	if (node.fragment.metadata.dynamic) return false;

	for (const attribute of node.attributes) {
		if (attribute.type !== 'Attribute') {
			return false;
		}

		if (is_event_attribute(attribute)) {
			return false;
		}

		if (attribute.value !== true && !is_text_attribute(attribute)) {
			return false;
		}

		if (node.name === 'option' && attribute.name === 'value') {
			return false;
		}

		if (node.name.includes('-')) {
			return false; // TODO this feels unnecessary, but tests break
		}
	}

	return true;
}
