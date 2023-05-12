import { escape_html } from '../../utils/stringify.js';

/**
 * @param {import('../../nodes/Text.js').default} node
 * @param {import('../Renderer.js').default} renderer
 * @param {import('../Renderer.js').RenderOptions} _options
 */
export default function (node, renderer, _options) {
	let text = node.data;
	if (node.use_space()) {
		text = ' ';
	} else if (
		!node.parent ||
		node.parent.type !== 'Element' ||
		(/** @type {import('../../nodes/Element.js').default} */ (node.parent).name !== 'script' &&
			/** @type {import('../../nodes/Element.js').default} */ (node.parent).name !== 'style')
	) {
		// unless this Text node is inside a <script> or <style> element, escape &,<,>
		text = escape_html(text);
	}
	renderer.add_string(text);
}
