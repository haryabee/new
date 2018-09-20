import Binding from '../../../../nodes/Binding';
import Element from '../../../../nodes/Element';
import ElementWrapper from '..';
import BindingWrapper from './Binding';

export default class SelectBinding extends BindingWrapper {
	element: ElementWrapper;
	node: Binding;

	static filter(
		node: Element,
		binding_lookup: Record<string, Binding>,
		type: string
	) {
		return node.name === 'select' && binding_lookup.value;
	}

	constructor(
		element: ElementWrapper,
		binding_lookup: Record<string, Binding>
	) {
		super(element, binding_lookup.value);
		this.events = ['change'];

		element.renderer.hasComplexBindings = true;

		// TODO does this also apply to e.g. `<input type='checkbox' bind:group='foo'>`?
		const dependencies = this.binding.value.dependencies;
		this.element.selectBindingDependencies = dependencies;
		dependencies.forEach((prop: string) => {
			element.renderer.component.indirectDependencies.set(prop, new Set());
		});
	}

	fromDom() {
		return this.element.node.getStaticAttributeValue('multiple') === true ?
			`@selectMultipleValue(${this.element.var})` :
			`@selectValue(${this.element.var})`;
	}

	toDom() {
		return this.element.getStaticAttributeValue('multiple') === true ?
			`@selectOptions(${this.element.var}, ${this.binding.value.snippet});` :
			`@selectOption(${this.element.var}, ${this.binding.value.snippet});`;
	}
}