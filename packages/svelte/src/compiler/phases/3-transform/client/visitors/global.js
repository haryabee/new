/** @import { Visitors } from '../types' */
import { AnimateDirective } from './AnimateDirective.js';
import { ArrowFunctionExpression } from './ArrowFunctionExpression.js';
import { AssignmentExpression } from './AssignmentExpression.js';
import { AwaitBlock } from './AwaitBlock.js';
import { BindDirective } from './BindDirective.js';
import { Comment } from './Comment.js';
import { ConstTag } from './ConstTag.js';
import { DebugTag } from './DebugTag.js';
import { EachBlock } from './EachBlock.js';
import { Fragment } from './Fragment.js';
import { FunctionDeclaration } from './FunctionDeclaration.js';
import { FunctionExpression } from './FunctionExpression.js';
import { HtmlTag } from './HtmlTag.js';
import { Identifier } from './Identifier.js';
import { IfBlock } from './IfBlock.js';
import { KeyBlock } from './KeyBlock.js';
import { MemberExpression } from './MemberExpression.js';
import { OnDirective } from './OnDirective.js';
import { RegularElement } from './RegularElement.js';
import { RenderTag } from './RenderTag.js';
import { SnippetBlock } from './SnippetBlock.js';
import { SvelteElement } from './SvelteElement.js';
import { TransitionDirective } from './TransitionDirective.js';
import { UpdateExpression } from './UpdateExpression.js';
import { UseDirective } from './UseDirective.js';

/** @type {Visitors} */
export const global_visitors = {
	AnimateDirective,
	ArrowFunctionExpression,
	AssignmentExpression,
	AwaitBlock,
	BindDirective,
	Comment,
	ConstTag,
	DebugTag,
	EachBlock,
	Fragment,
	FunctionDeclaration,
	FunctionExpression,
	HtmlTag,
	Identifier,
	IfBlock,
	KeyBlock,
	MemberExpression,
	OnDirective,
	RegularElement,
	RenderTag,
	SnippetBlock,
	SvelteElement,
	TransitionDirective,
	UpdateExpression,
	UseDirective
};
