import Binding from '../../../../nodes/Binding';
import Element from '../../../../nodes/Element';
import ElementWrapper from '..';
import BindingWrapper from './Binding';

export default class InputCheckboxBinding extends BindingWrapper {
	events = ['change'];

	static filter(
		node: Element,
		binding_lookup: Record<string, Binding>,
		type: string
	) {
		return (
			node.name === 'input' &&
			binding_lookup.checked &&
			type === 'checkbox'
		);
	}

	constructor(
		element: ElementWrapper,
		binding_lookup: Record<string, Binding>
	) {
		super(element, binding_lookup.checked);
	}

	fromDom() {
		return `${this.element.var}.checked`;
	}

	toDom() {
		return `${this.element.var}.checked = ${this.binding.value.snippet};`;
	}
}