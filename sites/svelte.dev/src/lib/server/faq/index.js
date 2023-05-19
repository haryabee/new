// @ts-check
import { CONTENT_BASE_PATHS } from '../../../constants.js';
import fs from 'node:fs';
import { extract_frontmatter } from '../markdown/index.js';
import { render_markdown } from '../markdown/renderer.js';

/** @param {import('./types').FAQData} faq_data */
export async function get_parsed_faq(faq_data) {
	const str = faq_data.map(({ content, title }) => `## ${title}\n\n${content}`).join('\n\n');

	return await render_markdown('faq', str);
}

/**
 * @returns {import('./types').FAQData}
 */
export function get_faq_data(base = CONTENT_BASE_PATHS.FAQ) {
	const faqs = [];

	for (const file of fs.readdirSync(base)) {
		const { metadata, body } = extract_frontmatter(fs.readFileSync(`${base}/${file}`, 'utf-8'));

		faqs.push({
			title: metadata.question, // Initialise with empty
			slug: file.split('-').slice(1).join('-').replace('.md', ''),
			content: body
		});
	}

	return faqs;
}
