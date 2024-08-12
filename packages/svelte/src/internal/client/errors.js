/* This file is generated by scripts/process-messages/index.js. Do not edit! */

import { DEV } from 'esm-env';

/**
 * Using `bind:value` together with a checkbox input is not allowed. Use `bind:checked` instead
 * @returns {never}
 */
export function bind_invalid_checkbox_value() {
	if (DEV) {
		const error = new Error(`bind_invalid_checkbox_value\nUsing \`bind:value\` together with a checkbox input is not allowed. Use \`bind:checked\` instead`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("bind_invalid_checkbox_value");
	}
}

/**
 * Component %component% has an export named `%key%` that a consumer component is trying to access using `bind:%key%`, which is disallowed. Instead, use `bind:this` (e.g. `<%name% bind:this={component} />`) and then access the property on the bound component instance (e.g. `component.%key%`)
 * @param {string} component
 * @param {string} key
 * @param {string} name
 * @returns {never}
 */
export function bind_invalid_export(component, key, name) {
	if (DEV) {
		const error = new Error(`bind_invalid_export\nComponent ${component} has an export named \`${key}\` that a consumer component is trying to access using \`bind:${key}\`, which is disallowed. Instead, use \`bind:this\` (e.g. \`<${name} bind:this={component} />\`) and then access the property on the bound component instance (e.g. \`component.${key}\`)`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("bind_invalid_export");
	}
}

/**
 * A component is attempting to bind to a non-bindable property `%key%` belonging to %component% (i.e. `<%name% bind:%key%={...}>`). To mark a property as bindable: `let { %key% = $bindable() } = $props()`
 * @param {string} key
 * @param {string} component
 * @param {string} name
 * @returns {never}
 */
export function bind_not_bindable(key, component, name) {
	if (DEV) {
		const error = new Error(`bind_not_bindable\nA component is attempting to bind to a non-bindable property \`${key}\` belonging to ${component} (i.e. \`<${name} bind:${key}={...}>\`). To mark a property as bindable: \`let { ${key} = $bindable() } = $props()\``);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("bind_not_bindable");
	}
}

/**
 * %parent% called `%method%` on an instance of %component%, which is no longer valid in Svelte 5. See https://svelte-5-preview.vercel.app/docs/breaking-changes#components-are-no-longer-classes for more information
 * @param {string} parent
 * @param {string} method
 * @param {string} component
 * @returns {never}
 */
export function component_api_changed(parent, method, component) {
	if (DEV) {
		const error = new Error(`component_api_changed\n${parent} called \`${method}\` on an instance of ${component}, which is no longer valid in Svelte 5. See https://svelte-5-preview.vercel.app/docs/breaking-changes#components-are-no-longer-classes for more information`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("component_api_changed");
	}
}

/**
 * Attempted to instantiate %component% with `new %name%`, which is no longer valid in Svelte 5. If this component is not under your control, set the `compatibility.componentApi` compiler option to `4` to keep it working. See https://svelte-5-preview.vercel.app/docs/breaking-changes#components-are-no-longer-classes for more information
 * @param {string} component
 * @param {string} name
 * @returns {never}
 */
export function component_api_invalid_new(component, name) {
	if (DEV) {
		const error = new Error(`component_api_invalid_new\nAttempted to instantiate ${component} with \`new ${name}\`, which is no longer valid in Svelte 5. If this component is not under your control, set the \`compatibility.componentApi\` compiler option to \`4\` to keep it working. See https://svelte-5-preview.vercel.app/docs/breaking-changes#components-are-no-longer-classes for more information`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("component_api_invalid_new");
	}
}

/**
 * A derived value cannot reference itself recursively
 * @returns {never}
 */
export function derived_references_self() {
	if (DEV) {
		const error = new Error(`derived_references_self\nA derived value cannot reference itself recursively`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("derived_references_self");
	}
}

/**
 * Keyed each block has duplicate key `%value%` at indexes %a% and %b%
 * @param {string} a
 * @param {string} b
 * @param {string | undefined | null} [value]
 * @returns {never}
 */
export function each_key_duplicate(a, b, value) {
	if (DEV) {
		const error = new Error(`each_key_duplicate\n${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("each_key_duplicate");
	}
}

/**
 * `%rune%` cannot be used inside an effect cleanup function
 * @param {string} rune
 * @returns {never}
 */
export function effect_in_teardown(rune) {
	if (DEV) {
		const error = new Error(`effect_in_teardown\n\`${rune}\` cannot be used inside an effect cleanup function`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("effect_in_teardown");
	}
}

/**
 * Effect cannot be created inside a `$derived` value that was not itself created inside an effect
 * @returns {never}
 */
export function effect_in_unowned_derived() {
	if (DEV) {
		const error = new Error(`effect_in_unowned_derived\nEffect cannot be created inside a \`$derived\` value that was not itself created inside an effect`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("effect_in_unowned_derived");
	}
}

/**
 * `%rune%` can only be used inside an effect (e.g. during component initialisation)
 * @param {string} rune
 * @returns {never}
 */
export function effect_orphan(rune) {
	if (DEV) {
		const error = new Error(`effect_orphan\n\`${rune}\` can only be used inside an effect (e.g. during component initialisation)`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("effect_orphan");
	}
}

/**
 * Maximum update depth exceeded. This can happen when a reactive block or effect repeatedly sets a new value. Svelte limits the number of nested updates to prevent infinite loops
 * @returns {never}
 */
export function effect_update_depth_exceeded() {
	if (DEV) {
		const error = new Error(`effect_update_depth_exceeded\nMaximum update depth exceeded. This can happen when a reactive block or effect repeatedly sets a new value. Svelte limits the number of nested updates to prevent infinite loops`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("effect_update_depth_exceeded");
	}
}

/**
 * Failed to hydrate the application
 * @returns {never}
 */
export function hydration_failed() {
	if (DEV) {
		const error = new Error(`hydration_failed\nFailed to hydrate the application`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("hydration_failed");
	}
}

/**
 * `%name%(...)` cannot be used in runes mode
 * @param {string} name
 * @returns {never}
 */
export function lifecycle_legacy_only(name) {
	if (DEV) {
		const error = new Error(`lifecycle_legacy_only\n\`${name}(...)\` cannot be used in runes mode`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("lifecycle_legacy_only");
	}
}

/**
 * Cannot do `bind:%key%={undefined}` when `%key%` has a fallback value
 * @param {string} key
 * @returns {never}
 */
export function props_invalid_value(key) {
	if (DEV) {
		const error = new Error(`props_invalid_value\nCannot do \`bind:${key}={undefined}\` when \`${key}\` has a fallback value`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("props_invalid_value");
	}
}

/**
 * Rest element properties of `$props()` such as `%property%` are readonly
 * @param {string} property
 * @returns {never}
 */
export function props_rest_readonly(property) {
	if (DEV) {
		const error = new Error(`props_rest_readonly\nRest element properties of \`$props()\` such as \`${property}\` are readonly`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("props_rest_readonly");
	}
}

/**
 * The `%rune%` rune is only available inside `.svelte` and `.svelte.js/ts` files
 * @param {string} rune
 * @returns {never}
 */
export function rune_outside_svelte(rune) {
	if (DEV) {
		const error = new Error(`rune_outside_svelte\nThe \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("rune_outside_svelte");
	}
}

/**
 * Cannot set prototype of `$state` object
 * @returns {never}
 */
export function state_prototype_fixed() {
	if (DEV) {
		const error = new Error(`state_prototype_fixed\nCannot set prototype of \`$state\` object`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("state_prototype_fixed");
	}
}

/**
 * Updating state inside a derived is forbidden. If the value should not be reactive, declare it without `$state`
 * @returns {never}
 */
export function state_unsafe_mutation() {
	if (DEV) {
		const error = new Error(`state_unsafe_mutation\nUpdating state inside a derived is forbidden. If the value should not be reactive, declare it without \`$state\``);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("state_unsafe_mutation");
	}
}

/**
 * The `this={...}` property of a `<svelte:component>` must be a Svelte component, if defined
 * @returns {never}
 */
export function svelte_component_invalid_this_value() {
	if (DEV) {
		const error = new Error(`svelte_component_invalid_this_value\nThe \`this={...}\` property of a \`<svelte:component>\` must be a Svelte component, if defined`);

		error.name = 'Svelte error';
		throw error;
	} else {
		// TODO print a link to the documentation
		throw new Error("svelte_component_invalid_this_value");
	}
}