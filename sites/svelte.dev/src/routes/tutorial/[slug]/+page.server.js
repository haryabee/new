import {
	get_parsed_tutorial,
	get_tutorial_data,
	get_tutorial_list
} from '$lib/server/tutorial/index.js';
import { error, redirect } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
	console.log('coming in', params.slug, params);
	if (params.slug === 'local-transitions') throw redirect(307, '/tutorial/global-transitions');

	const tutorial_data = get_tutorial_data();
	const tutorials_list = get_tutorial_list(tutorial_data);

	const tutorial = await get_parsed_tutorial(tutorial_data, params.slug);

	if (!tutorial) throw error(404);

	return {
		tutorials_list,
		tutorial,
		slug: params.slug
	};
}

export async function entries() {
	const tutorials_list = get_tutorial_list(get_tutorial_data());
	return tutorials_list
		.map(({ tutorials }) => tutorials)
		.flatMap((val) => val.map(({ slug }) => ({ slug })));
}
