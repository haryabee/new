/* This file is generated by scripts/process-messages.js. Do not edit! */

import { getLocator } from 'locate-character';

/** @typedef {{ start?: number, end?: number }} NodeLike */
/** @type {import('#compiler').Warning[]} */
let warnings = [];
/** @type {string | undefined} */
let filename;
let locator = getLocator('', { offsetLine: 1 });

/**
 * @param {{
 *   source: string;
 *   filename: string | undefined;
 * }} options
 * @returns {import('#compiler').Warning[]}
 */
export function reset_warnings(options) {
	filename = options.filename;
	locator = getLocator(options.source, { offsetLine: 1 });
	return warnings = [];
}

/**
 * @param {null | NodeLike} node
 * @param {string} code
 * @param {string} message
 */
function w(node, code, message) {
	// @ts-expect-error
	if (node.ignores?.has(code)) return;

	warnings.push({
		code,
		message,
		filename,
		start: node?.start !== undefined ? locator(node.start) : undefined,
		end: node?.end !== undefined ? locator(node.end) : undefined
	});
}

/**
 * <%name%> should not have aria-* attributes
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function a11y_aria_attributes(node, name) {
	w(node, "a11y_aria_attributes", `<${name}> should not have aria-* attributes`);
}

/**
 * Unknown aria attribute 'aria-%attribute%'
 * @param {null | NodeLike} node
 * @param {string} attribute
 */
export function a11y_unknown_aria_attribute(node, attribute) {
	w(node, "a11y_unknown_aria_attribute", `Unknown aria attribute 'aria-${attribute}'`);
}

/**
 * Unknown aria attribute 'aria-%attribute%'. Did you mean '%suggestion%'?
 * @param {null | NodeLike} node
 * @param {string} attribute
 * @param {string} suggestion
 */
export function a11y_unknown_aria_attribute_suggestion(node, attribute, suggestion) {
	w(node, "a11y_unknown_aria_attribute_suggestion", `Unknown aria attribute 'aria-${attribute}'. Did you mean '${suggestion}'?`);
}

/**
 * <%name%> element should not be hidden
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function a11y_hidden(node, name) {
	w(node, "a11y_hidden", `<${name}> element should not be hidden`);
}

/**
 * The value of '%attribute%' must be either 'true' or 'false'
 * @param {null | NodeLike} node
 * @param {string} attribute
 */
export function a11y_incorrect_aria_attribute_type_boolean(node, attribute) {
	w(node, "a11y_incorrect_aria_attribute_type_boolean", `The value of '${attribute}' must be either 'true' or 'false'`);
}

/**
 * The value of '%attribute%' must be an integer
 * @param {null | NodeLike} node
 * @param {string} attribute
 */
export function a11y_incorrect_aria_attribute_type_integer(node, attribute) {
	w(node, "a11y_incorrect_aria_attribute_type_integer", `The value of '${attribute}' must be an integer`);
}

/**
 * The value of '%attribute%' must be a string that represents a DOM element ID
 * @param {null | NodeLike} node
 * @param {string} attribute
 */
export function a11y_incorrect_aria_attribute_type_id(node, attribute) {
	w(node, "a11y_incorrect_aria_attribute_type_id", `The value of '${attribute}' must be a string that represents a DOM element ID`);
}

/**
 * The value of '%attribute%' must be a space-separated list of strings that represent DOM element IDs
 * @param {null | NodeLike} node
 * @param {string} attribute
 */
export function a11y_incorrect_aria_attribute_type_idlist(node, attribute) {
	w(node, "a11y_incorrect_aria_attribute_type_idlist", `The value of '${attribute}' must be a space-separated list of strings that represent DOM element IDs`);
}

/**
 * The value of '%attribute%' must be exactly one of true, false, or mixed
 * @param {null | NodeLike} node
 * @param {string} attribute
 */
export function a11y_incorrect_aria_attribute_type_tristate(node, attribute) {
	w(node, "a11y_incorrect_aria_attribute_type_tristate", `The value of '${attribute}' must be exactly one of true, false, or mixed`);
}

/**
 * The value of '%attribute%' must be exactly one of %values%
 * @param {null | NodeLike} node
 * @param {string} attribute
 * @param {string} values
 */
export function a11y_incorrect_aria_attribute_type_token(node, attribute, values) {
	w(node, "a11y_incorrect_aria_attribute_type_token", `The value of '${attribute}' must be exactly one of ${values}`);
}

/**
 * The value of '%attribute%' must be a space-separated list of one or more of %values%
 * @param {null | NodeLike} node
 * @param {string} attribute
 * @param {string} values
 */
export function a11y_incorrect_aria_attribute_type_tokenlist(node, attribute, values) {
	w(node, "a11y_incorrect_aria_attribute_type_tokenlist", `The value of '${attribute}' must be a space-separated list of one or more of ${values}`);
}

/**
 * The value of '%attribute%' must be of type %type%
 * @param {null | NodeLike} node
 * @param {string} attribute
 * @param {string} type
 */
export function a11y_incorrect_aria_attribute_type(node, attribute, type) {
	w(node, "a11y_incorrect_aria_attribute_type", `The value of '${attribute}' must be of type ${type}`);
}

/**
 * Elements with attribute aria-activedescendant should have tabindex value
 * @param {null | NodeLike} node
 */
export function a11y_aria_activedescendant_has_tabindex(node) {
	w(node, "a11y_aria_activedescendant_has_tabindex", "Elements with attribute aria-activedescendant should have tabindex value");
}

/**
 * <%name%> should not have role attribute
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function a11y_misplaced_role(node, name) {
	w(node, "a11y_misplaced_role", `<${name}> should not have role attribute`);
}

/**
 * Abstract role '%role%' is forbidden
 * @param {null | NodeLike} node
 * @param {string} role
 */
export function a11y_no_abstract_role(node, role) {
	w(node, "a11y_no_abstract_role", `Abstract role '${role}' is forbidden`);
}

/**
 * Unknown role '%role%'
 * @param {null | NodeLike} node
 * @param {string} role
 */
export function a11y_unknown_role(node, role) {
	w(node, "a11y_unknown_role", `Unknown role '${role}'`);
}

/**
 * Unknown role '%role%'. Did you mean '%suggestion%'?
 * @param {null | NodeLike} node
 * @param {string} role
 * @param {string} suggestion
 */
export function a11y_unknown_role_suggestion(node, role, suggestion) {
	w(node, "a11y_unknown_role_suggestion", `Unknown role '${role}'. Did you mean '${suggestion}'?`);
}

/**
 * Redundant role '%role%'
 * @param {null | NodeLike} node
 * @param {string} role
 */
export function a11y_no_redundant_roles(node, role) {
	w(node, "a11y_no_redundant_roles", `Redundant role '${role}'`);
}

/**
 * Elements with the ARIA role "%role%" must have the following attributes defined: %props%
 * @param {null | NodeLike} node
 * @param {string} role
 * @param {string} props
 */
export function a11y_role_has_required_aria_props(node, role, props) {
	w(node, "a11y_role_has_required_aria_props", `Elements with the ARIA role "${role}" must have the following attributes defined: ${props}`);
}

/**
 * Elements with the '%role%' interactive role must have a tabindex value.
 * @param {null | NodeLike} node
 * @param {string} role
 */
export function a11y_interactive_supports_focus(node, role) {
	w(node, "a11y_interactive_supports_focus", `Elements with the '${role}' interactive role must have a tabindex value.`);
}

/**
 * <%element%> cannot have role '%role%'
 * @param {null | NodeLike} node
 * @param {string} element
 * @param {string} role
 */
export function a11y_no_interactive_element_to_noninteractive_role(node, element, role) {
	w(node, "a11y_no_interactive_element_to_noninteractive_role", `<${element}> cannot have role '${role}'`);
}

/**
 * Non-interactive element <%element%> cannot have interactive role '%role%'
 * @param {null | NodeLike} node
 * @param {string} element
 * @param {string} role
 */
export function a11y_no_noninteractive_element_to_interactive_role(node, element, role) {
	w(node, "a11y_no_noninteractive_element_to_interactive_role", `Non-interactive element <${element}> cannot have interactive role '${role}'`);
}

/**
 * Avoid using accesskey
 * @param {null | NodeLike} node
 */
export function a11y_accesskey(node) {
	w(node, "a11y_accesskey", "Avoid using accesskey");
}

/**
 * Avoid using autofocus
 * @param {null | NodeLike} node
 */
export function a11y_autofocus(node) {
	w(node, "a11y_autofocus", "Avoid using autofocus");
}

/**
 * The scope attribute should only be used with <th> elements
 * @param {null | NodeLike} node
 */
export function a11y_misplaced_scope(node) {
	w(node, "a11y_misplaced_scope", "The scope attribute should only be used with <th> elements");
}

/**
 * Avoid tabindex values above zero
 * @param {null | NodeLike} node
 */
export function a11y_positive_tabindex(node) {
	w(node, "a11y_positive_tabindex", "Avoid tabindex values above zero");
}

/**
 * Visible, non-interactive elements with a click event must be accompanied by a keyboard event handler. Consider whether an interactive element such as <button type="button"> or <a> might be more appropriate. See https://svelte.dev/docs/accessibility-warnings#a11y-click-events-have-key-events for more details.
 * @param {null | NodeLike} node
 */
export function a11y_click_events_have_key_events(node) {
	w(node, "a11y_click_events_have_key_events", "Visible, non-interactive elements with a click event must be accompanied by a keyboard event handler. Consider whether an interactive element such as <button type=\"button\"> or <a> might be more appropriate. See https://svelte.dev/docs/accessibility-warnings#a11y-click-events-have-key-events for more details.");
}

/**
 * noninteractive element cannot have nonnegative tabIndex value
 * @param {null | NodeLike} node
 */
export function a11y_no_noninteractive_tabindex(node) {
	w(node, "a11y_no_noninteractive_tabindex", "noninteractive element cannot have nonnegative tabIndex value");
}

/**
 * The attribute '%attribute%' is not supported by the role '%role%'
 * @param {null | NodeLike} node
 * @param {string} attribute
 * @param {string} role
 */
export function a11y_role_supports_aria_props(node, attribute, role) {
	w(node, "a11y_role_supports_aria_props", `The attribute '${attribute}' is not supported by the role '${role}'`);
}

/**
 * The attribute '%attribute%' is not supported by the role '%role%'. This role is implicit on the element <%name%>
 * @param {null | NodeLike} node
 * @param {string} attribute
 * @param {string} role
 * @param {string} name
 */
export function a11y_role_supports_aria_props_implicit(node, attribute, role, name) {
	w(node, "a11y_role_supports_aria_props_implicit", `The attribute '${attribute}' is not supported by the role '${role}'. This role is implicit on the element <${name}>`);
}

/**
 * Non-interactive element <%element%> should not be assigned mouse or keyboard event listeners.
 * @param {null | NodeLike} node
 * @param {string} element
 */
export function a11y_no_noninteractive_element_interactions(node, element) {
	w(node, "a11y_no_noninteractive_element_interactions", `Non-interactive element <${element}> should not be assigned mouse or keyboard event listeners.`);
}

/**
 * <%element%> with a %handler% handler must have an ARIA role
 * @param {null | NodeLike} node
 * @param {string} element
 * @param {string} handler
 */
export function a11y_no_static_element_interactions(node, element, handler) {
	w(node, "a11y_no_static_element_interactions", `<${element}> with a ${handler} handler must have an ARIA role`);
}

/**
 * '%href_value%' is not a valid %href_attribute% attribute
 * @param {null | NodeLike} node
 * @param {string} href_value
 * @param {string} href_attribute
 */
export function a11y_invalid_attribute(node, href_value, href_attribute) {
	w(node, "a11y_invalid_attribute", `'${href_value}' is not a valid ${href_attribute} attribute`);
}

/**
 * <%name%> element should have %article% %sequence% attribute
 * @param {null | NodeLike} node
 * @param {string} name
 * @param {string} article
 * @param {string} sequence
 */
export function a11y_missing_attribute(node, name, article, sequence) {
	w(node, "a11y_missing_attribute", `<${name}> element should have ${article} ${sequence} attribute`);
}

/**
 * The value '%value%' is not supported by the attribute 'autocomplete' on element <input type="%type%">
 * @param {null | NodeLike} node
 * @param {string} value
 * @param {string} type
 */
export function a11y_autocomplete_valid(node, value, type) {
	w(node, "a11y_autocomplete_valid", `The value '${value}' is not supported by the attribute 'autocomplete' on element <input type="${type}">`);
}

/**
 * Screenreaders already announce <img> elements as an image.
 * @param {null | NodeLike} node
 */
export function a11y_img_redundant_alt(node) {
	w(node, "a11y_img_redundant_alt", "Screenreaders already announce <img> elements as an image.");
}

/**
 * A form label must be associated with a control.
 * @param {null | NodeLike} node
 */
export function a11y_label_has_associated_control(node) {
	w(node, "a11y_label_has_associated_control", "A form label must be associated with a control.");
}

/**
 * <video> elements must have a <track kind="captions">
 * @param {null | NodeLike} node
 */
export function a11y_media_has_caption(node) {
	w(node, "a11y_media_has_caption", "<video> elements must have a <track kind=\"captions\">");
}

/**
 * Avoid <%name%> elements
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function a11y_distracting_elements(node, name) {
	w(node, "a11y_distracting_elements", `Avoid <${name}> elements`);
}

/**
 * `<figcaption>` must be an immediate child of `<figure>`
 * @param {null | NodeLike} node
 */
export function a11y_figcaption_parent(node) {
	w(node, "a11y_figcaption_parent", "`<figcaption>` must be an immediate child of `<figure>`");
}

/**
 * `<figcaption>` must be first or last child of `<figure>`
 * @param {null | NodeLike} node
 */
export function a11y_figcaption_index(node) {
	w(node, "a11y_figcaption_index", "`<figcaption>` must be first or last child of `<figure>`");
}

/**
 * '%event%' event must be accompanied by '%accompanied_by%' event
 * @param {null | NodeLike} node
 * @param {string} event
 * @param {string} accompanied_by
 */
export function a11y_mouse_events_have_key_events(node, event, accompanied_by) {
	w(node, "a11y_mouse_events_have_key_events", `'${event}' event must be accompanied by '${accompanied_by}' event`);
}

/**
 * <%name%> element should have child content
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function a11y_missing_content(node, name) {
	w(node, "a11y_missing_content", `<${name}> element should have child content`);
}

/**
 * The "is" attribute is not supported cross-browser and should be avoided
 * @param {null | NodeLike} node
 */
export function avoid_is(node) {
	w(node, "avoid_is", "The \"is\" attribute is not supported cross-browser and should be avoided");
}

/**
 * You are referencing globalThis.%name%. Did you forget to declare a variable with that name?
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function global_event_reference(node, name) {
	w(node, "global_event_reference", `You are referencing globalThis.${name}. Did you forget to declare a variable with that name?`);
}

/**
 * Attributes should not contain ':' characters to prevent ambiguity with Svelte directives
 * @param {null | NodeLike} node
 */
export function illegal_attribute_character(node) {
	w(node, "illegal_attribute_character", "Attributes should not contain ':' characters to prevent ambiguity with Svelte directives");
}

/**
 * '%wrong%' is not a valid HTML attribute. Did you mean '%right%'?
 * @param {null | NodeLike} node
 * @param {string} wrong
 * @param {string} right
 */
export function invalid_html_attribute(node, wrong, right) {
	w(node, "invalid_html_attribute", `'${wrong}' is not a valid HTML attribute. Did you mean '${right}'?`);
}

/**
 * Empty block
 * @param {null | NodeLike} node
 */
export function empty_block(node) {
	w(node, "empty_block", "Empty block");
}

/**
 * <%name%> will be treated as an HTML element unless it begins with a capital letter
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function component_name_lowercase(node, name) {
	w(node, "component_name_lowercase", `<${name}> will be treated as an HTML element unless it begins with a capital letter`);
}

/**
 * Unused CSS selector "%name%"
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function css_unused_selector(node, name) {
	w(node, "css_unused_selector", `Unused CSS selector "${name}"`);
}

/**
 * Reactive declarations only exist at the top level of the instance script
 * @param {null | NodeLike} node
 */
export function no_reactive_declaration(node) {
	w(node, "no_reactive_declaration", "Reactive declarations only exist at the top level of the instance script");
}

/**
 * All dependencies of the reactive declaration are declared in a module script and will not be reactive
 * @param {null | NodeLike} node
 */
export function module_script_reactive_declaration(node) {
	w(node, "module_script_reactive_declaration", "All dependencies of the reactive declaration are declared in a module script and will not be reactive");
}

/**
 * Component has unused export property '%name%'. If it is for external reference only, please consider using `export const %name%`
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function unused_export_let(node, name) {
	w(node, "unused_export_let", `Component has unused export property '${name}'. If it is for external reference only, please consider using \`export const ${name}\``);
}

/**
 * Using <slot> to render parent content is deprecated. Use {@render ...} tags instead.
 * @param {null | NodeLike} node
 */
export function deprecated_slot_element(node) {
	w(node, "deprecated_slot_element", "Using <slot> to render parent content is deprecated. Use {@render ...} tags instead.");
}

/**
 * Using on:%name% to listen to the %name% event is is deprecated. Use the event attribute on%name% instead.
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function deprecated_event_handler(node, name) {
	w(node, "deprecated_event_handler", `Using on:${name} to listen to the ${name} event is is deprecated. Use the event attribute on${name} instead.`);
}

/**
 * Self-closing HTML tags for non-void elements are ambiguous — use <%name% ...></%name%> rather than <%name% ... />
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function invalid_self_closing_tag(node, name) {
	w(node, "invalid_self_closing_tag", `Self-closing HTML tags for non-void elements are ambiguous — use <${name} ...></${name}> rather than <${name} ... />`);
}

/**
 * The 'customElement' option is used when generating a custom element. Did you forget the 'customElement: true' compile option?
 * @param {null | NodeLike} node
 */
export function missing_custom_element_compile_option(node) {
	w(node, "missing_custom_element_compile_option", "The 'customElement' option is used when generating a custom element. Did you forget the 'customElement: true' compile option?");
}

/**
 * Avoid 'new class' — instead, declare the class at the top level scope
 * @param {null | NodeLike} node
 */
export function avoid_inline_class(node) {
	w(node, "avoid_inline_class", "Avoid 'new class' — instead, declare the class at the top level scope");
}

/**
 * Avoid declaring classes below the top level scope
 * @param {null | NodeLike} node
 */
export function avoid_nested_class(node) {
	w(node, "avoid_nested_class", "Avoid declaring classes below the top level scope");
}

/**
 * It looks like you're using the `$%name%` rune, but there is a local binding called `%name%`. Referencing a local variable with a `$` prefix will create a store subscription. Please rename `%name%` to avoid the ambiguity
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function store_with_rune_name(node, name) {
	w(node, "store_with_rune_name", `It looks like you're using the \`$${name}\` rune, but there is a local binding called \`${name}\`. Referencing a local variable with a \`$\` prefix will create a store subscription. Please rename \`${name}\` to avoid the ambiguity`);
}

/**
 * `%name%` is updated, but is not declared with `$state(...)`. Changing its value will not correctly trigger updates
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function non_state_reference(node, name) {
	w(node, "non_state_reference", `\`${name}\` is updated, but is not declared with \`$state(...)\`. Changing its value will not correctly trigger updates`);
}

/**
 * Use `$derived.by(() => {...})` instead of `$derived((() => {...})())`
 * @param {null | NodeLike} node
 */
export function derived_iife(node) {
	w(node, "derived_iife", "Use `$derived.by(() => {...})` instead of `$derived((() => {...})())`");
}

/**
 * Component properties are declared using `$props()` in runes mode. Did you forget to call the function?
 * @param {null | NodeLike} node
 */
export function invalid_props_declaration(node) {
	w(node, "invalid_props_declaration", "Component properties are declared using `$props()` in runes mode. Did you forget to call the function?");
}

/**
 * Bindable component properties are declared using `$bindable()` in runes mode. Did you forget to call the function?
 * @param {null | NodeLike} node
 */
export function invalid_bindable_declaration(node) {
	w(node, "invalid_bindable_declaration", "Bindable component properties are declared using `$bindable()` in runes mode. Did you forget to call the function?");
}

/**
 * State referenced in its own scope will never update. Did you mean to reference it inside a closure?
 * @param {null | NodeLike} node
 */
export function static_state_reference(node) {
	w(node, "static_state_reference", "State referenced in its own scope will never update. Did you mean to reference it inside a closure?");
}

/**
 * The rest operator (...) will create a new object and binding '%name%' with the original object will not work
 * @param {null | NodeLike} node
 * @param {string} name
 */
export function invalid_rest_eachblock_binding(node, name) {
	w(node, "invalid_rest_eachblock_binding", `The rest operator (...) will create a new object and binding '${name}' with the original object will not work`);
}