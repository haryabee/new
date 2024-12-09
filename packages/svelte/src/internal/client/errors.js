/* This file is generated by scripts/process-messages/index.js. Do not edit! */

import { DEV } from 'esm-env';

/**
 * Using `bind:value` together with a checkbox input is not allowed. Use `bind:checked` instead
 * @returns {never}
 */
export function bind_invalid_checkbox_value() {
	if (DEV) {
		const error = new Error(`bind_invalid_checkbox_value\nUsing \`bind:value\` together with a checkbox input is not allowed. Use \`bind:checked\` instead\nSee https://svelte.dev/e/bind_invalid_checkbox_value for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`bind_invalid_checkbox_value (https://svelte.dev/e/bind_invalid_checkbox_value)`);
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
		const error = new Error(`bind_invalid_export\nComponent ${component} has an export named \`${key}\` that a consumer component is trying to access using \`bind:${key}\`, which is disallowed. Instead, use \`bind:this\` (e.g. \`<${name} bind:this={component} />\`) and then access the property on the bound component instance (e.g. \`component.${key}\`)\nSee https://svelte.dev/e/bind_invalid_export for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`bind_invalid_export (https://svelte.dev/e/bind_invalid_export)`);
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
		const error = new Error(`bind_not_bindable\nA component is attempting to bind to a non-bindable property \`${key}\` belonging to ${component} (i.e. \`<${name} bind:${key}={...}>\`). To mark a property as bindable: \`let { ${key} = $bindable() } = $props()\`\nSee https://svelte.dev/e/bind_not_bindable for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`bind_not_bindable (https://svelte.dev/e/bind_not_bindable)`);
	}
}

/**
 * %parent% called `%method%` on an instance of %component%, which is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information
 * @param {string} parent
 * @param {string} method
 * @param {string} component
 * @returns {never}
 */
export function component_api_changed(parent, method, component) {
	if (DEV) {
		const error = new Error(`component_api_changed\n${parent} called \`${method}\` on an instance of ${component}, which is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information\nSee https://svelte.dev/e/component_api_changed for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`component_api_changed (https://svelte.dev/e/component_api_changed)`);
	}
}

/**
 * Attempted to instantiate %component% with `new %name%`, which is no longer valid in Svelte 5. If this component is not under your control, set the `compatibility.componentApi` compiler option to `4` to keep it working. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information
 * @param {string} component
 * @param {string} name
 * @returns {never}
 */
export function component_api_invalid_new(component, name) {
	if (DEV) {
		const error = new Error(`component_api_invalid_new\nAttempted to instantiate ${component} with \`new ${name}\`, which is no longer valid in Svelte 5. If this component is not under your control, set the \`compatibility.componentApi\` compiler option to \`4\` to keep it working. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information\nSee https://svelte.dev/e/component_api_invalid_new for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`component_api_invalid_new (https://svelte.dev/e/component_api_invalid_new)`);
	}
}

/**
 * A derived value cannot reference itself recursively
 * @returns {never}
 */
export function derived_references_self() {
	if (DEV) {
		const error = new Error(`derived_references_self\nA derived value cannot reference itself recursively\nSee https://svelte.dev/e/derived_references_self for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`derived_references_self (https://svelte.dev/e/derived_references_self)`);
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
		const error = new Error(`each_key_duplicate\n${value ? `Keyed each block has duplicate key \`${value}\` at indexes ${a} and ${b}` : `Keyed each block has duplicate key at indexes ${a} and ${b}`}\nSee https://svelte.dev/e/each_key_duplicate for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`each_key_duplicate (https://svelte.dev/e/each_key_duplicate)`);
	}
}

/**
 * `%rune%` cannot be used inside an effect cleanup function
 * @param {string} rune
 * @returns {never}
 */
export function effect_in_teardown(rune) {
	if (DEV) {
		const error = new Error(`effect_in_teardown\n\`${rune}\` cannot be used inside an effect cleanup function\nSee https://svelte.dev/e/each_key_duplicate for more infoeffect_in_teardown for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`effect_in_teardown (https://svelte.dev/e/effect_in_teardown)`);
	}
}

/**
 * Effect cannot be created inside a `$derived` value that was not itself created inside an effect
 * @returns {never}
 */
export function effect_in_unowned_derived() {
	if (DEV) {
		const error = new Error(`effect_in_unowned_derived\nEffect cannot be created inside a \`$derived\` value that was not itself created inside an effect\nSee https://svelte.dev/e/each_key_duplicate for more infoeffect_in_unowned_derived for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`effect_in_unowned_derived (https://svelte.dev/e/effect_in_unowned_derived)`);
	}
}

/**
 * `%rune%` can only be used inside an effect (e.g. during component initialisation)
 * @param {string} rune
 * @returns {never}
 */
export function effect_orphan(rune) {
	if (DEV) {
		const error = new Error(`effect_orphan\n\`${rune}\` can only be used inside an effect (e.g. during component initialisation)\nSee https://svelte.dev/e/each_key_duplicate for more infoeffect_orphan for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`effect_orphan (https://svelte.dev/e/effect_orphan)`);
	}
}

/**
 * Maximum update depth exceeded. This can happen when a reactive block or effect repeatedly sets a new value. Svelte limits the number of nested updates to prevent infinite loops
 * @returns {never}
 */
export function effect_update_depth_exceeded() {
	if (DEV) {
		const error = new Error(`effect_update_depth_exceeded\nMaximum update depth exceeded. This can happen when a reactive block or effect repeatedly sets a new value. Svelte limits the number of nested updates to prevent infinite loops\nSee https://svelte.dev/e/each_key_duplicate for more infoeffect_update_depth_exceeded for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`effect_update_depth_exceeded (https://svelte.dev/e/effect_update_depth_exceeded)`);
	}
}

/**
 * Failed to hydrate the application
 * @returns {never}
 */
export function hydration_failed() {
	if (DEV) {
		const error = new Error(`hydration_failed\nFailed to hydrate the application\nSee https://svelte.dev/e/each_key_duplicate for more infohydration_failed for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`hydration_failed (https://svelte.dev/e/hydration_failed)`);
	}
}

/**
 * Could not `{@render}` snippet due to the expression being `null` or `undefined`. Consider using optional chaining `{@render snippet?.()}`
 * @returns {never}
 */
export function invalid_snippet() {
	if (DEV) {
		const error = new Error(`invalid_snippet\nCould not \`{@render}\` snippet due to the expression being \`null\` or \`undefined\`. Consider using optional chaining \`{@render snippet?.()}\`\nSee https://svelte.dev/e/each_key_duplicate for more infoinvalid_snippet for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`invalid_snippet (https://svelte.dev/e/invalid_snippet)`);
	}
}

/**
 * `%name%(...)` cannot be used in runes mode
 * @param {string} name
 * @returns {never}
 */
export function lifecycle_legacy_only(name) {
	if (DEV) {
		const error = new Error(`lifecycle_legacy_only\n\`${name}(...)\` cannot be used in runes mode\nSee https://svelte.dev/e/each_key_duplicate for more infolifecycle_legacy_only for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`lifecycle_legacy_only (https://svelte.dev/e/lifecycle_legacy_only)`);
	}
}

/**
 * Cannot do `bind:%key%={undefined}` when `%key%` has a fallback value
 * @param {string} key
 * @returns {never}
 */
export function props_invalid_value(key) {
	if (DEV) {
		const error = new Error(`props_invalid_value\nCannot do \`bind:${key}={undefined}\` when \`${key}\` has a fallback value\nSee https://svelte.dev/e/each_key_duplicate for more infoprops_invalid_value for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`props_invalid_value (https://svelte.dev/e/props_invalid_value)`);
	}
}

/**
 * Rest element properties of `$props()` such as `%property%` are readonly
 * @param {string} property
 * @returns {never}
 */
export function props_rest_readonly(property) {
	if (DEV) {
		const error = new Error(`props_rest_readonly\nRest element properties of \`$props()\` such as \`${property}\` are readonly\nSee https://svelte.dev/e/each_key_duplicate for more infoprops_rest_readonly for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`props_rest_readonly (https://svelte.dev/e/props_rest_readonly)`);
	}
}

/**
 * The `%rune%` rune is only available inside `.svelte` and `.svelte.js/ts` files
 * @param {string} rune
 * @returns {never}
 */
export function rune_outside_svelte(rune) {
	if (DEV) {
		const error = new Error(`rune_outside_svelte\nThe \`${rune}\` rune is only available inside \`.svelte\` and \`.svelte.js/ts\` files\nSee https://svelte.dev/e/each_key_duplicate for more inforune_outside_svelte for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`rune_outside_svelte (https://svelte.dev/e/rune_outside_svelte)`);
	}
}

/**
 * Property descriptors defined on `$state` objects must contain `value` and always be `enumerable`, `configurable` and `writable`.
 * @returns {never}
 */
export function state_descriptors_fixed() {
	if (DEV) {
		const error = new Error(`state_descriptors_fixed\nProperty descriptors defined on \`$state\` objects must contain \`value\` and always be \`enumerable\`, \`configurable\` and \`writable\`.\nSee https://svelte.dev/e/each_key_duplicate for more infostate_descriptors_fixed for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`state_descriptors_fixed (https://svelte.dev/e/state_descriptors_fixed)`);
	}
}

/**
 * Cannot set prototype of `$state` object
 * @returns {never}
 */
export function state_prototype_fixed() {
	if (DEV) {
		const error = new Error(`state_prototype_fixed\nCannot set prototype of \`$state\` object\nSee https://svelte.dev/e/each_key_duplicate for more infostate_prototype_fixed for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`state_prototype_fixed (https://svelte.dev/e/state_prototype_fixed)`);
	}
}

/**
 * Reading state that was created inside the same derived is forbidden. Consider using `untrack` to read locally created state
 * @returns {never}
 */
export function state_unsafe_local_read() {
	if (DEV) {
		const error = new Error(`state_unsafe_local_read\nReading state that was created inside the same derived is forbidden. Consider using \`untrack\` to read locally created state\nSee https://svelte.dev/e/each_key_duplicate for more infostate_unsafe_local_read for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`state_unsafe_local_read (https://svelte.dev/e/state_unsafe_local_read)`);
	}
}

/**
 * Updating state inside a derived or a template expression is forbidden. If the value should not be reactive, declare it without `$state`
 * @returns {never}
 */
export function state_unsafe_mutation() {
	if (DEV) {
		const error = new Error(`state_unsafe_mutation\nUpdating state inside a derived or a template expression is forbidden. If the value should not be reactive, declare it without \`$state\`\nSee https://svelte.dev/e/each_key_duplicate for more infostate_unsafe_mutation for more info`);

		error.name = 'Svelte error';
		throw error;
	} else {
		throw new Error(`state_unsafe_mutation (https://svelte.dev/e/state_unsafe_mutation)`);
	}
}