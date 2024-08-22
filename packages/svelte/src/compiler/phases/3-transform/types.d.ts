import type { Scope } from '../scope.js';
import type { Ast, ValidatedModuleCompileOptions } from '#compiler';
import type { Analysis } from '../types.js';

export interface TransformState {
	readonly analysis: Analysis;
	readonly options: ValidatedModuleCompileOptions;
	readonly scope: Scope;
	readonly scopes: Map<Ast.SvelteNode, Scope>;
}
