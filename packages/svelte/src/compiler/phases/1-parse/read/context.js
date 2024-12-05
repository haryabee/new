/** @import { Location } from 'locate-character' */
/** @import { Pattern } from 'estree' */
/** @import { Parser } from '../index.js' */
// @ts-expect-error acorn type definitions are borked in the release we use
import { isIdentifierStart } from 'acorn';
import full_char_code_at from '../utils/full_char_code_at.js';
import {
	is_bracket_open,
	is_bracket_close,
	is_bracket_pair,
	get_bracket_close
} from '../utils/bracket.js';
import { parse_expression_at } from '../acorn.js';
import { regex_not_newline_characters } from '../../patterns.js';
import * as e from '../../../errors.js';
import { locator } from '../../../state.js';
import read_expression from './expression.js';
import { is_back_quote, is_quote } from '../utils/quote.js';

/**
 * @param {Parser} parser
 * @returns {Pattern}
 */
export default function read_pattern(parser) {
	const start = parser.index;
	let i = parser.index;

	const code = full_char_code_at(parser.template, i);
	if (isIdentifierStart(code, true)) {
		const name = /** @type {string} */ (parser.read_identifier());
		const annotation = read_type_annotation(parser);

		return {
			type: 'Identifier',
			name,
			start,
			loc: {
				start: /** @type {Location} */ (locator(start)),
				end: /** @type {Location} */ (locator(parser.index))
			},
			end: parser.index,
			typeAnnotation: annotation
		};
	}

	i = read_expression_length(parser, start);
	parser.index = i;

	const pattern_string = parser.template.slice(start, i);

	try {
		// the length of the `space_with_newline` has to be start - 1
		// because we added a `(` in front of the pattern_string,
		// which shifted the entire string to right by 1
		// so we offset it by removing 1 character in the `space_with_newline`
		// to achieve that, we remove the 1st space encountered,
		// so it will not affect the `column` of the node
		let space_with_newline = parser.template
			.slice(0, start)
			.replace(regex_not_newline_characters, ' ');
		const first_space = space_with_newline.indexOf(' ');
		space_with_newline =
			space_with_newline.slice(0, first_space) + space_with_newline.slice(first_space + 1);

		const expression = /** @type {any} */ (
			parse_expression_at(`${space_with_newline}(${pattern_string} = 1)`, parser.ts, start - 1)
		).left;

		expression.typeAnnotation = read_type_annotation(parser);
		if (expression.typeAnnotation) {
			expression.end = expression.typeAnnotation.end;
		}

		return expression;
	} catch (error) {
		parser.acorn_error(error);
	}
}

/**
 * @param {Parser} parser
 * @param {number} start
 */
function read_expression_length(parser, start) {
	let i = start;
	const code = full_char_code_at(parser.template, i);

	if (!is_bracket_open(code)) {
		e.expected_pattern(i);
	}

	const bracket_stack = [code];
	i += code <= 0xffff ? 1 : 2;

	while (i < parser.template.length) {
		let code = full_char_code_at(parser.template, i);
		if (is_quote(code)) {
			i = read_string_length(parser, i, code);
		} else {
			if (is_bracket_open(code)) {
				bracket_stack.push(code);
			} else if (is_bracket_close(code)) {
				const popped = /** @type {number} */ (bracket_stack.pop());
				if (!is_bracket_pair(popped, code)) {
					e.expected_token(
						i,
						String.fromCharCode(/** @type {number} */ (get_bracket_close(popped)))
					);
				}
				if (bracket_stack.length === 0) {
					i += code <= 0xffff ? 1 : 2;
					break;
				}
			}
			i += code <= 0xffff ? 1 : 2;
		}
	}

	return i;
}

/**
 * @param {Parser} parser
 * @param {number} start
 * @param {number} quote
 */
function read_string_length(parser, start, quote) {
	let i = start;
	i += quote <= 0xffff ? 1 : 2;

	const BACKSLASH = '\\'.charCodeAt(0);
	const DOLAR = '$'.charCodeAt(0);
	const LEFT_BRACKET = '{'.charCodeAt(0);

	let is_escaped = false;
	while (i < parser.template.length) {
		const code = full_char_code_at(parser.template, i);
		if (!is_escaped && code === quote) {
			break;
		}

		if (!is_escaped && code === BACKSLASH) {
			is_escaped = true;
		} else if (is_escaped) {
			is_escaped = false;
		}

		if (
			i < parser.template.length - 1 &&
			is_back_quote(quote) &&
			code === DOLAR &&
			full_char_code_at(parser.template, i + 1) === LEFT_BRACKET
		) {
			i++;
			i = read_expression_length(parser, i);
		} else {
			i += code <= 0xffff ? 1 : 2;
		}
	}

	const code = full_char_code_at(parser.template, i);
	if (code !== quote) {
		e.unterminated_string_constant(start);
	}

	return i + (code <= 0xffff ? 1 : 2);
}

/**
 * @param {Parser} parser
 * @returns {any}
 */
function read_type_annotation(parser) {
	const start = parser.index;
	parser.allow_whitespace();

	if (!parser.eat(':')) {
		parser.index = start;
		return undefined;
	}

	// we need to trick Acorn into parsing the type annotation
	const insert = '_ as ';
	let a = parser.index - insert.length;
	const template =
		parser.template.slice(0, a).replace(/[^\n]/g, ' ') +
		insert +
		// If this is a type annotation for a function parameter, Acorn-TS will treat subsequent
		// parameters as part of a sequence expression instead, and will then error on optional
		// parameters (`?:`). Therefore replace that sequence with something that will not error.
		parser.template.slice(parser.index).replace(/\?\s*:/g, ':');
	let expression = parse_expression_at(template, parser.ts, a);

	// `foo: bar = baz` gets mangled — fix it
	if (expression.type === 'AssignmentExpression') {
		let b = expression.right.start;
		while (template[b] !== '=') b -= 1;
		expression = parse_expression_at(template.slice(0, b), parser.ts, a);
	}

	// `array as item: string, index` becomes `string, index`, which is mistaken as a sequence expression - fix that
	if (expression.type === 'SequenceExpression') {
		expression = expression.expressions[0];
	}

	parser.index = /** @type {number} */ (expression.end);
	return {
		type: 'TSTypeAnnotation',
		start,
		end: parser.index,
		typeAnnotation: /** @type {any} */ (expression).typeAnnotation
	};
}
