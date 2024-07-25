/** @import { Expression, ExpressionStatement, MethodDefinition, Pattern, Program, Property, PropertyDefinition, Statement, VariableDeclarator } from 'estree' */
/** @import { Binding, Namespace, SvelteNode, ValidatedCompileOptions, ValidatedModuleCompileOptions } from '#compiler' */
/** @import { ComponentServerTransformState, ComponentVisitors, ServerTransformState, Visitors } from './types.js' */
/** @import { Analysis, ComponentAnalysis } from '../../types.js' */
/** @import { Scope } from '../../scope.js' */
/** @import { StateField } from '../../3-transform/client/types.js' */ // TODO move this type
import { walk } from 'zimmerframe';
import { set_scope } from '../../scope.js';
import { extract_identifiers, extract_paths, is_expression_async } from '../../../utils/ast.js';
import * as b from '../../../utils/builders.js';
import { filename } from '../../../state.js';
import { render_stylesheet } from '../css/index.js';
import { AssignmentExpression } from './visitors/javascript/AssignmentExpression.js';
import { CallExpression } from './visitors/javascript/CallExpression.js';
import { ClassBodyRunes } from './visitors/javascript/ClassBody.js';
import { ExpressionStatementRunes } from './visitors/javascript/ExpressionStatement.js';
import { Identifier } from './visitors/javascript/Identifier.js';
import { MemberExpressionRunes } from './visitors/javascript/MemberExpression.js';
import { UpdateExpression } from './visitors/javascript/UpdateExpression.js';
import { PropertyDefinitionRunes } from './visitors/javascript/PropertyDefinition.js';
import {
	VariableDeclarationLegacy,
	VariableDeclarationRunes
} from './visitors/javascript/VariableDeclaration.js';
import { AwaitBlock } from './visitors/template/AwaitBlock.js';
import { Component } from './visitors/template/Component.js';
import { ConstTag } from './visitors/template/ConstTag.js';
import { DebugTag } from './visitors/template/DebugTag.js';
import { EachBlock } from './visitors/template/EachBlock.js';
import { Fragment } from './visitors/template/Fragment.js';
import { HtmlTag } from './visitors/template/HtmlTag.js';
import { IfBlock } from './visitors/template/IfBlock.js';
import { KeyBlock } from './visitors/template/KeyBlock.js';
import { LetDirective } from './visitors/template/LetDirective.js';
import { RegularElement } from './visitors/template/RegularElement.js';
import { RenderTag } from './visitors/template/RenderTag.js';
import { SlotElement } from './visitors/template/SlotElement.js';
import { SnippetBlock } from './visitors/template/SnippetBlock.js';
import { SpreadAttribute } from './visitors/template/SpreadAttribute.js';
import { SvelteComponent } from './visitors/template/SvelteComponent.js';
import { SvelteElement } from './visitors/template/SvelteElement.js';
import { SvelteFragment } from './visitors/template/SvelteFragment.js';
import { SvelteHead } from './visitors/template/SvelteHead.js';
import { SvelteSelf } from './visitors/template/SvelteSelf.js';
import { TitleElement } from './visitors/template/TitleElement.js';

/**
 * @param {VariableDeclarator} declarator
 * @param {Scope} scope
 * @param {Expression} value
 * @returns {VariableDeclarator[]}
 */
function create_state_declarators(declarator, scope, value) {
	if (declarator.id.type === 'Identifier') {
		return [b.declarator(declarator.id, value)];
	}

	const tmp = scope.generate('tmp');
	const paths = extract_paths(declarator.id);
	return [
		b.declarator(b.id(tmp), value), // TODO inject declarator for opts, so we can use it below
		...paths.map((path) => {
			const value = path.expression?.(b.id(tmp));
			return b.declarator(path.node, value);
		})
	];
}

/** @type {Visitors} */
const global_visitors = {
	AssignmentExpression,
	Identifier,
	UpdateExpression,
	CallExpression
};

/** @type {Visitors} */
const javascript_visitors_runes = {
	ClassBody: ClassBodyRunes,
	PropertyDefinition: PropertyDefinitionRunes,
	VariableDeclaration: VariableDeclarationRunes,
	ExpressionStatement: ExpressionStatementRunes,
	MemberExpression: MemberExpressionRunes
};

/** @type {Visitors} */
const javascript_visitors_legacy = {
	VariableDeclaration: VariableDeclarationLegacy,
	LabeledStatement(node, context) {
		if (context.path.length > 1) return;
		if (node.label.name !== '$') return;

		// TODO bail out if we're in module context

		// these statements will be topologically ordered later
		context.state.legacy_reactive_statements.set(
			node,
			// people could do "break $" inside, so we need to keep the label
			b.labeled('$', /** @type {ExpressionStatement} */ (context.visit(node.body)))
		);

		return b.empty;
	}
};

/** @type {ComponentVisitors} */
const template_visitors = {
	AwaitBlock,
	Component,
	ConstTag,
	DebugTag,
	EachBlock,
	Fragment,
	HtmlTag,
	IfBlock,
	KeyBlock,
	LetDirective,
	RegularElement,
	RenderTag,
	SlotElement,
	SnippetBlock,
	SpreadAttribute,
	SvelteComponent,
	SvelteElement,
	SvelteFragment,
	SvelteHead,
	SvelteSelf,
	TitleElement
};

/**
 * @param {ComponentAnalysis} analysis
 * @param {ValidatedCompileOptions} options
 * @returns {Program}
 */
export function server_component(analysis, options) {
	/** @type {ComponentServerTransformState} */
	const state = {
		analysis,
		options,
		scope: analysis.module.scope,
		scopes: analysis.template.scopes,
		hoisted: [b.import_all('$', 'svelte/internal/server')],
		legacy_reactive_statements: new Map(),
		// these are set inside the `Fragment` visitor, and cannot be used until then
		init: /** @type {any} */ (null),
		template: /** @type {any} */ (null),
		namespace: options.namespace,
		preserve_whitespace: options.preserveWhitespace,
		private_derived: new Map(),
		getters: {},
		skip_hydration_boundaries: false
	};

	const module = /** @type {Program} */ (
		walk(
			/** @type {SvelteNode} */ (analysis.module.ast),
			state,
			// @ts-expect-error TODO: zimmerframe types
			{
				...set_scope(analysis.module.scopes),
				...global_visitors,
				...(analysis.runes ? javascript_visitors_runes : javascript_visitors_legacy)
			}
		)
	);

	const instance = /** @type {Program} */ (
		walk(
			/** @type {SvelteNode} */ (analysis.instance.ast),
			{ ...state, scope: analysis.instance.scope },
			// @ts-expect-error TODO: zimmerframe types
			{
				...set_scope(analysis.instance.scopes),
				...global_visitors,
				...(analysis.runes ? javascript_visitors_runes : javascript_visitors_legacy),
				ImportDeclaration(node) {
					state.hoisted.push(node);
					return b.empty;
				},
				ExportNamedDeclaration(node, context) {
					if (node.declaration) {
						return context.visit(node.declaration);
					}

					return b.empty;
				}
			}
		)
	);

	const template = /** @type {Program} */ (
		walk(
			/** @type {SvelteNode} */ (analysis.template.ast),
			{ ...state, scope: analysis.template.scope },
			// @ts-expect-error TODO: zimmerframe types
			{
				...set_scope(analysis.template.scopes),
				...global_visitors,
				...template_visitors
			}
		)
	);

	/** @type {VariableDeclarator[]} */
	const legacy_reactive_declarations = [];

	for (const [node] of analysis.reactive_statements) {
		const statement = [...state.legacy_reactive_statements].find(([n]) => n === node);
		if (statement === undefined) {
			throw new Error('Could not find reactive statement');
		}

		if (
			node.body.type === 'ExpressionStatement' &&
			node.body.expression.type === 'AssignmentExpression'
		) {
			for (const id of extract_identifiers(node.body.expression.left)) {
				const binding = analysis.instance.scope.get(id.name);
				if (binding?.kind === 'legacy_reactive') {
					legacy_reactive_declarations.push(b.declarator(id));
				}
			}
		}

		instance.body.push(statement[1]);
	}

	if (legacy_reactive_declarations.length > 0) {
		instance.body.unshift({
			type: 'VariableDeclaration',
			kind: 'let',
			declarations: legacy_reactive_declarations
		});
	}

	// If the component binds to a child, we need to put the template in a loop and repeat until legacy bindings are stable.
	// We can remove this once the legacy syntax is gone.
	if (analysis.uses_component_bindings) {
		const snippets = template.body.filter(
			(node) =>
				node.type === 'FunctionDeclaration' &&
				// @ts-expect-error
				node.___snippet
		);
		const rest = template.body.filter(
			(node) =>
				node.type !== 'FunctionDeclaration' ||
				// @ts-expect-error
				!node.___snippet
		);
		template.body = [
			...snippets,
			b.let('$$settled', b.true),
			b.let('$$inner_payload'),
			b.stmt(
				b.function(
					b.id('$$render_inner'),
					[b.id('$$payload')],
					b.block(/** @type {Statement[]} */ (rest))
				)
			),
			b.do_while(
				b.unary('!', b.id('$$settled')),
				b.block([
					b.stmt(b.assignment('=', b.id('$$settled'), b.true)),
					b.stmt(
						b.assignment('=', b.id('$$inner_payload'), b.call('$.copy_payload', b.id('$$payload')))
					),
					b.stmt(b.call('$$render_inner', b.id('$$inner_payload')))
				])
			),
			b.stmt(b.call('$.assign_payload', b.id('$$payload'), b.id('$$inner_payload')))
		];
	}

	if (
		[...analysis.instance.scope.declarations.values()].some(
			(binding) => binding.kind === 'store_sub'
		)
	) {
		instance.body.unshift(b.var('$$store_subs'));
		template.body.push(
			b.if(b.id('$$store_subs'), b.stmt(b.call('$.unsubscribe_stores', b.id('$$store_subs'))))
		);
	}
	// Propagate values of bound props upwards if they're undefined in the parent and have a value.
	// Don't do this as part of the props retrieval because people could eagerly mutate the prop in the instance script.
	/** @type {Property[]} */
	const props = [];
	for (const [name, binding] of analysis.instance.scope.declarations) {
		if (binding.kind === 'bindable_prop' && !name.startsWith('$$')) {
			props.push(b.init(binding.prop_alias ?? name, b.id(name)));
		}
	}
	for (const { name, alias } of analysis.exports) {
		props.push(b.init(alias ?? name, b.id(name)));
	}
	if (props.length > 0) {
		// This has no effect in runes mode other than throwing an error when someone passes
		// undefined to a binding that has a default value.
		template.body.push(b.stmt(b.call('$.bind_props', b.id('$$props'), b.object(props))));
	}
	/** @type {Expression[]} */
	const push_args = [];
	if (options.dev) push_args.push(b.id(analysis.name));

	const component_block = b.block([
		.../** @type {Statement[]} */ (instance.body),
		.../** @type {Statement[]} */ (template.body)
	]);

	let should_inject_context = analysis.needs_context || options.dev;

	if (should_inject_context) {
		component_block.body.unshift(b.stmt(b.call('$.push', ...push_args)));
		component_block.body.push(b.stmt(b.call('$.pop')));
	}

	if (analysis.uses_rest_props) {
		/** @type {string[]} */
		const named_props = analysis.exports.map(({ name, alias }) => alias ?? name);
		for (const [name, binding] of analysis.instance.scope.declarations) {
			if (binding.kind === 'bindable_prop') named_props.push(binding.prop_alias ?? name);
		}

		component_block.body.unshift(
			b.const(
				'$$restProps',
				b.call(
					'$.rest_props',
					b.id('$$sanitized_props'),
					b.array(named_props.map((name) => b.literal(name)))
				)
			)
		);
	}

	if (analysis.uses_props || analysis.uses_rest_props) {
		component_block.body.unshift(
			b.const('$$sanitized_props', b.call('$.sanitize_props', b.id('$$props')))
		);
	}

	if (analysis.uses_slots) {
		component_block.body.unshift(b.const('$$slots', b.call('$.sanitize_slots', b.id('$$props'))));
	}

	const body = [...state.hoisted, ...module.body];

	if (analysis.css.ast !== null && options.css === 'injected' && !options.customElement) {
		const hash = b.literal(analysis.css.hash);
		const code = b.literal(render_stylesheet(analysis.source, analysis, options).code);

		body.push(b.const('$$css', b.object([b.init('hash', hash), b.init('code', code)])));
		component_block.body.unshift(b.stmt(b.call('$$payload.css.add', b.id('$$css'))));
	}

	let should_inject_props =
		should_inject_context ||
		props.length > 0 ||
		analysis.needs_props ||
		analysis.uses_props ||
		analysis.uses_rest_props ||
		analysis.uses_slots ||
		analysis.slot_names.size > 0;

	const component_function = b.function_declaration(
		b.id(analysis.name),
		should_inject_props ? [b.id('$$payload'), b.id('$$props')] : [b.id('$$payload')],
		component_block
	);
	if (options.compatibility.componentApi === 4) {
		body.unshift(b.imports([['render', '$$_render']], 'svelte/server'));
		body.push(
			component_function,
			b.stmt(
				b.assignment(
					'=',
					b.member_id(`${analysis.name}.render`),
					b.function(
						null,
						[b.id('$$props'), b.id('$$opts')],
						b.block([
							b.return(
								b.call(
									'$$_render',
									b.id(analysis.name),
									b.object([
										b.init('props', b.id('$$props')),
										b.init('context', b.member(b.id('$$opts'), b.id('context'), false, true))
									])
								)
							)
						])
					)
				)
			),
			b.export_default(b.id(analysis.name))
		);
	} else if (options.dev) {
		body.push(
			component_function,
			b.stmt(
				b.assignment(
					'=',
					b.member_id(`${analysis.name}.render`),
					b.function(
						null,
						[],
						b.block([
							b.throw_error(
								`Component.render(...) is no longer valid in Svelte 5. ` +
									'See https://svelte-5-preview.vercel.app/docs/breaking-changes#components-are-no-longer-classes for more information'
							)
						])
					)
				)
			),
			b.export_default(b.id(analysis.name))
		);
	} else {
		body.push(b.export_default(component_function));
	}

	if (options.dev && filename) {
		// add `App[$.FILENAME] = 'App.svelte'` so that we can print useful messages later
		body.unshift(
			b.stmt(
				b.assignment(
					'=',
					b.member(b.id(analysis.name), b.id('$.FILENAME'), true),
					b.literal(filename)
				)
			)
		);
	}

	return {
		type: 'Program',
		sourceType: 'module',
		body
	};
}

/**
 * @param {Analysis} analysis
 * @param {ValidatedModuleCompileOptions} options
 * @returns {Program}
 */
export function server_module(analysis, options) {
	/** @type {ServerTransformState} */
	const state = {
		analysis,
		options,
		scope: analysis.module.scope,
		scopes: analysis.module.scopes,
		// this is an anomaly — it can only be used in components, but it needs
		// to be present for `javascript_visitors_legacy` and so is included in module
		// transform state as well as component transform state
		legacy_reactive_statements: new Map(),
		private_derived: new Map(),
		getters: {}
	};

	const module = /** @type {Program} */ (
		walk(/** @type {SvelteNode} */ (analysis.module.ast), state, {
			...set_scope(analysis.module.scopes),
			...global_visitors,
			...javascript_visitors_runes
		})
	);

	return {
		type: 'Program',
		sourceType: 'module',
		body: [b.import_all('$', 'svelte/internal/server'), ...module.body]
	};
}
