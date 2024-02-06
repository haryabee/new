import { error } from '../../../errors.js';

const REGEX_MATCHER = /^[~^$*|]?=/;
const REGEX_CLOSING_BRACKET = /[\s\]]/;
const REGEX_ATTRIBUTE_FLAGS = /^[a-zA-Z]+/; // only `i` and `s` are valid today, but make it future-proof
const REGEX_COMBINATOR_WHITESPACE = /^\s*(\+|~|>|\|\|)\s*/;
const REGEX_COMBINATOR = /^(\+|~|>|\|\|)/;
const REGEX_PERCENTAGE = /^\d+(\.\d+)?%/;
const REGEX_NTH_OF =
	/^(even|odd|\+?(\d+|\d*n(\s*[+-]\s*\d+)?)|-\d*n(\s*\+\s*\d+))((?=\s*[,)])|\s+of\s+)/;
const REGEX_WHITESPACE_OR_COLON = /[\s:]/;
const REGEX_LEADING_HYPHEN_OR_DIGIT = /-?\d/;
const REGEX_SEMICOLON_OR_OPEN_BRACE_OR_CLOSE_BRACE = /[;{}]/;
const REGEX_VALID_IDENTIFIER_CHAR = /[a-zA-Z0-9_-]/;
const REGEX_COMMENT_CLOSE = /\*\//;
const REGEX_HTML_COMMENT_CLOSE = /-->/;

/**
 * @param {import('../index.js').Parser} parser
 * @param {number} start
 * @param {Array<import('#compiler').Attribute | import('#compiler').SpreadAttribute | import('#compiler').Directive>} attributes
 * @returns {import('#compiler').Style}
 */
export default function read_style(parser, start, attributes) {
	const content_start = parser.index;
	const children = read_body(parser, '</style');
	const content_end = parser.index;

	parser.read(/^<\/style\s*>/);

	return {
		type: 'Style',
		start,
		end: parser.index,
		attributes,
		children,
		content: {
			start: content_start,
			end: content_end,
			styles: parser.template.slice(content_start, content_end)
		},
		parent: null
	};
}

/**
 * @param {import('../index.js').Parser} parser
 * @param {string} close
 * @returns {any[]}
 */
function read_body(parser, close) {
	/** @type {Array<import('#compiler').Css.Rule | import('#compiler').Css.Atrule>} */
	const children = [];

	while (parser.index < parser.template.length) {
		allow_comment_or_whitespace(parser);

		if (parser.match(close)) {
			return children;
		}

		if (parser.match('@')) {
			children.push(read_at_rule(parser));
		} else {
			children.push(read_rule(parser));
		}
	}

	error(parser.template.length, 'expected-token', close);
}

/**
 * @param {import('../index.js').Parser} parser
 * @returns {import('#compiler').Css.Atrule}
 */
function read_at_rule(parser) {
	const start = parser.index;
	parser.eat('@', true);

	const name = read_identifier(parser);

	const prelude = read_value(parser);

	/** @type {import('#compiler').Css.Block | null} */
	let block = null;

	// eg: `@media (max-width: 600px) { ... }`
	if (parser.match('{')) {
		block = read_block(parser);
	} else {
		// eg: `@import 'foo';`
		parser.eat(';', true);
	}

	return {
		type: 'Atrule',
		start,
		end: parser.index,
		name,
		prelude,
		block
	};
}

/**
 * @param {import('../index.js').Parser} parser
 * @returns {import('#compiler').Css.Rule}
 */
function read_rule(parser) {
	const start = parser.index;

	return {
		type: 'Rule',
		prelude: read_selector_list(parser),
		block: read_block(parser),
		start,
		end: parser.index
	};
}

/**
 * @param {import('../index.js').Parser} parser
 * @param {boolean} [inside_pseudo_class]
 * @returns {import('#compiler').Css.SelectorList}
 */
function read_selector_list(parser, inside_pseudo_class = false) {
	/** @type {import('#compiler').Css.Selector[]} */
	const children = [];

	allow_comment_or_whitespace(parser);

	const start = parser.index;

	while (parser.index < parser.template.length) {
		children.push(read_selector(parser, inside_pseudo_class));

		const end = parser.index;

		parser.allow_whitespace();

		if (inside_pseudo_class ? parser.match(')') : parser.match('{')) {
			return {
				type: 'SelectorList',
				start,
				end,
				children
			};
		} else {
			parser.eat(',', true);
			allow_comment_or_whitespace(parser);
		}
	}

	error(parser.template.length, 'unexpected-eof');
}

/**
 * @param {import('../index.js').Parser} parser
 * @param {boolean} [inside_pseudo_class]
 * @returns {import('#compiler').Css.Selector}
 */
function read_selector(parser, inside_pseudo_class = false) {
	const list_start = parser.index;

	/** @type {Array<import('#compiler').Css.SimpleSelector | import('#compiler').Css.Combinator>} */
	const children = [];

	while (parser.index < parser.template.length) {
		const start = parser.index;

		if (parser.eat('&')) {
			children.push({
				type: 'NestingSelector',
				name: '&',
				start,
				end: parser.index
			});
		} else if (parser.eat('*')) {
			let name = '*';
			if (parser.match('|')) {
				// * is the namespace (which we ignore)
				parser.index++;
				name = read_identifier(parser);
			}
			children.push({
				type: 'TypeSelector',
				name,
				start,
				end: parser.index
			});
		} else if (parser.eat('#')) {
			children.push({
				type: 'IdSelector',
				name: read_identifier(parser),
				start,
				end: parser.index
			});
		} else if (parser.eat('.')) {
			children.push({
				type: 'ClassSelector',
				name: read_identifier(parser),
				start,
				end: parser.index
			});
		} else if (parser.eat('::')) {
			children.push({
				type: 'PseudoElementSelector',
				name: read_identifier(parser),
				start,
				end: parser.index
			});
			// We read the inner selectors of a pseudo element to ensure it parses correctly,
			// but we don't do anything with the result.
			if (parser.eat('(')) {
				read_selector_list(parser, true);
				parser.eat(')', true);
			}
		} else if (parser.eat(':')) {
			const name = read_identifier(parser);

			/** @type {null | import('#compiler').Css.SelectorList} */
			let args = null;

			if (parser.eat('(')) {
				args = read_selector_list(parser, true);
				parser.eat(')', true);
			} else if (name === 'global') {
				error(parser.index, 'invalid-css-global-selector');
			}

			children.push({
				type: 'PseudoClassSelector',
				name,
				args,
				start,
				end: parser.index
			});
		} else if (parser.eat('[')) {
			parser.allow_whitespace();
			const name = read_identifier(parser);
			parser.allow_whitespace();

			/** @type {string | null} */
			let value = null;

			const matcher = parser.read(REGEX_MATCHER);

			if (matcher) {
				parser.allow_whitespace();
				value = read_attribute_value(parser);
			}

			parser.allow_whitespace();

			const flags = parser.read(REGEX_ATTRIBUTE_FLAGS);

			parser.allow_whitespace();
			parser.eat(']', true);

			children.push({
				type: 'AttributeSelector',
				start,
				end: parser.index,
				name,
				matcher,
				value,
				flags
			});
		} else if (inside_pseudo_class && parser.match_regex(REGEX_NTH_OF)) {
			// nth of matcher must come before combinator matcher to prevent collision else the '+' in '+2n-1' would be parsed as a combinator

			children.push({
				type: 'Nth',
				value: /**@type {string} */ (parser.read(REGEX_NTH_OF)),
				start,
				end: parser.index
			});
		} else if (parser.match_regex(REGEX_COMBINATOR_WHITESPACE)) {
			parser.allow_whitespace();
			const start = parser.index;
			children.push({
				type: 'Combinator',
				name: /** @type {string} */ (parser.read(REGEX_COMBINATOR)),
				start,
				end: parser.index
			});
			parser.allow_whitespace();
		} else if (parser.match_regex(REGEX_PERCENTAGE)) {
			children.push({
				type: 'Percentage',
				value: /** @type {string} */ (parser.read(REGEX_PERCENTAGE)),
				start,
				end: parser.index
			});
		} else {
			let name = read_identifier(parser);
			if (parser.match('|')) {
				// we ignore the namespace when trying to find matching element classes
				parser.index++;
				name = read_identifier(parser);
			}
			children.push({
				type: 'TypeSelector',
				name,
				start,
				end: parser.index
			});
		}

		const index = parser.index;
		parser.allow_whitespace();

		if (parser.match(',') || (inside_pseudo_class ? parser.match(')') : parser.match('{'))) {
			parser.index = index;

			return {
				type: 'Selector',
				start: list_start,
				end: index,
				children
			};
		}

		if (parser.index !== index && !parser.match_regex(REGEX_COMBINATOR)) {
			children.push({
				type: 'Combinator',
				name: ' ',
				start: index,
				end: parser.index
			});
		}
	}

	error(parser.template.length, 'unexpected-eof');
}

/**
 * @param {import('../index.js').Parser} parser
 * @returns {import('#compiler').Css.Block}
 */
function read_block(parser) {
	const start = parser.index;

	parser.eat('{', true);

	/** @type {Array<import('#compiler').Css.Declaration | import('#compiler').Css.Rule | import('#compiler').Css.Atrule>} */
	const children = [];

	while (parser.index < parser.template.length) {
		allow_comment_or_whitespace(parser);

		if (parser.match('}')) {
			break;
		} else {
			children.push(read_block_item(parser));
		}
	}

	parser.eat('}', true);

	return {
		type: 'Block',
		start,
		end: parser.index,
		children
	};
}

/**
 * @param {import('../index.js').Parser} parser
 * @returns {import('#compiler').Css.Declaration}
 */
function read_declaration(parser) {
	const start = parser.index;

	const property = parser.read_until(REGEX_WHITESPACE_OR_COLON);
	parser.allow_whitespace();
	parser.eat(':');
	parser.allow_whitespace();

	const value = read_value(parser);

	const end = parser.index;

	if (!parser.match('}')) {
		parser.eat(';', true);
	}

	return {
		type: 'Declaration',
		start,
		end,
		property,
		value
	};
}

/**
 * Reads a declaration, rule or at-rule
 *
 * @param {import('../index.js').Parser} parser
 * @returns {import('#compiler').Css.Declaration | import('#compiler').Css.Rule | import('#compiler').Css.Atrule}
 */
function read_block_item(parser) {
	if (parser.match('@')) {
		return read_at_rule(parser);
	}

	const start = parser.index;
	parser.read_until(REGEX_SEMICOLON_OR_OPEN_BRACE_OR_CLOSE_BRACE);

	// if we've run into a '{', it's a rule, otherwise we ran into
	// a ';' or '}' so it's a declaration
	if (parser.match('{')) {
		// Rewind to the start of the rule
		parser.index = start;
		return read_rule(parser);
	}
	// Rewind to the start of the declaration
	parser.index = start;
	return read_declaration(parser);
}

/**
 * @param {import('../index.js').Parser} parser
 * @returns {string}
 */
function read_value(parser) {
	let value = '';
	let escaped = false;
	let in_url = false;

	/** @type {null | '"' | "'"} */
	let quote_mark = null;

	while (parser.index < parser.template.length) {
		const char = parser.template[parser.index];

		if (escaped) {
			value += '\\' + char;
			escaped = false;
		} else if (char === '\\') {
			escaped = true;
		} else if (char === quote_mark) {
			quote_mark = null;
		} else if (char === ')') {
			in_url = false;
		} else if (quote_mark === null && (char === '"' || char === "'")) {
			quote_mark = char;
		} else if (char === '(' && value.slice(-3) === 'url') {
			in_url = true;
		} else if ((char === ';' || char === '{' || char === '}') && !in_url && !quote_mark) {
			return value.trim();
		}

		value += char;

		parser.index++;
	}

	error(parser.template.length, 'unexpected-eof');
}

/**
 * Read a property that may or may not be quoted, e.g.
 * `foo` or `'foo bar'` or `"foo bar"`
 * @param {import('../index.js').Parser} parser
 */
function read_attribute_value(parser) {
	let value = '';
	let escaped = false;
	const quote_mark = parser.eat('"') ? '"' : parser.eat("'") ? "'" : null;

	while (parser.index < parser.template.length) {
		const char = parser.template[parser.index];
		if (escaped) {
			value += '\\' + char;
			escaped = false;
		} else if (char === '\\') {
			escaped = true;
		} else if (quote_mark ? char === quote_mark : REGEX_CLOSING_BRACKET.test(char)) {
			if (quote_mark) {
				parser.eat(quote_mark, true);
			}

			return value.trim();
		} else {
			value += char;
		}

		parser.index++;
	}

	error(parser.template.length, 'unexpected-eof');
}

/**
 * https://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
 * @param {import('../index.js').Parser} parser
 */
function read_identifier(parser) {
	const start = parser.index;

	let identifier = '';

	if (parser.match('--') || parser.match_regex(REGEX_LEADING_HYPHEN_OR_DIGIT)) {
		error(start, 'invalid-css-identifier');
	}

	let escaped = false;

	while (parser.index < parser.template.length) {
		const char = parser.template[parser.index];
		if (escaped) {
			identifier += '\\' + char;
			escaped = false;
		} else if (char === '\\') {
			escaped = true;
		} else if (
			/** @type {number} */ (char.codePointAt(0)) >= 160 ||
			REGEX_VALID_IDENTIFIER_CHAR.test(char)
		) {
			identifier += char;
		} else {
			break;
		}

		parser.index++;
	}

	if (identifier === '') {
		error(start, 'invalid-css-identifier');
	}

	return identifier;
}

/** @param {import('../index.js').Parser} parser */
function allow_comment_or_whitespace(parser) {
	parser.allow_whitespace();
	while (parser.match('/*') || parser.match('<!--')) {
		if (parser.eat('/*')) {
			parser.read_until(REGEX_COMMENT_CLOSE);
			parser.eat('*/', true);
		}

		if (parser.eat('<!--')) {
			parser.read_until(REGEX_HTML_COMMENT_CLOSE);
			parser.eat('-->', true);
		}

		parser.allow_whitespace();
	}
}
