import * as assert from 'assert';
import CustomElement from './main.svelte';
import { create_custom_element } from 'svelte/internal';

export default function (target) {
	customElements.define('no-tag', create_custom_element(CustomElement, { name: {}}, [], []));
	target.innerHTML = '<no-tag name="world"></no-tag>';

	const el = target.querySelector('no-tag');
	const h1 = el.shadowRoot.querySelector('h1');

	assert.equal(h1.textContent, 'Hello world!');
}
