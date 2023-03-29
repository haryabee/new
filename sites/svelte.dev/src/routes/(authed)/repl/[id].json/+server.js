import { dev } from '$app/environment';
import { client } from '$lib/db/client';
import * as gist from '$lib/db/gist';
import * as session from '$lib/db/session';
import { get_example } from '$lib/server/examples';
import { get_examples_data, get_examples_list } from '$lib/server/examples/get-examples';
import { error, json } from '@sveltejs/kit';

const UUID_REGEX = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/;

const examples_data = get_examples_data();

const examples = new Set(
	get_examples_list(examples_data)
		.map((category) => category.examples)
		.flat()
		.map((example) => example.slug)
);

/** @param {import('$lib/server/examples/types').ExamplesData[number]['examples'][number]['files'][number][]} files  */
function munge(files) {
	return files
		.map((file) => {
			const dot = file.name.lastIndexOf('.');
			let name = file.name.slice(0, dot);
			let type = file.name.slice(dot + 1);

			if (type === 'html') type = 'svelte';
			// @ts-expect-error what is file.source? by @PuruVJ
			return { name, type, source: file.source ?? file.content ?? '' };
		})
		.sort((a, b) => {
			if (a.name === 'App' && a.type === 'svelte') return -1;
			if (b.name === 'App' && b.type === 'svelte') return 1;

			if (a.type !== b.type) return a.type === 'svelte' ? -1 : 1;

			return a.name < b.name ? -1 : 1;
		});
}

export async function GET({ params }) {
	if (examples.has(params.id)) {
		const example = get_example(examples_data, params.id);

		return json({
			id: params.id,
			name: example.title,
			owner: null,
			relaxed: false, // TODO is this right? EDIT: It was example.relaxed before, which no example return to my knowledge. By @PuruVJ
			components: munge(example.files),
		});
	}

	if (dev && !client) {
		// in dev with no local Supabase configured, proxy to production
		// this lets us at least load saved REPLs
		return await fetch(`https://svelte.dev/repl/${params.id}.json`);
	}

	if (!UUID_REGEX.test(params.id)) {
		throw error(404);
	}

	const app = await gist.read(params.id);

	if (!app) {
		throw error(404, 'not found');
	}

	return json({
		id: params.id,
		name: app.name,
		owner: app.userid,
		relaxed: false,
		// @ts-expect-error app.files has a `source` property
		components: munge(app.files),
	});
}

// TODO reimplement as an action
export async function PUT({ params, request }) {
	const user = await session.from_cookie(request.headers.get('cookie'));
	if (!user) throw error(401, 'Unauthorized');

	const body = await request.json();
	await gist.update(user, params.id, body);

	return new Response(undefined, { status: 204 });
}
