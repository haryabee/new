import Node from './shared/Node';
import Expression from './shared/Expression';
import Component from '../Component';
import TemplateScope from './shared/TemplateScope';
import { TemplateNode } from '../../interfaces';
import Element from './Element';

export default class Animation extends Node {
	type: 'Animation';
	name: string;
	expression: Expression;

	constructor(component: Component, parent: Element, scope: TemplateScope, info: TemplateNode) {
		super(component, parent, scope, info);

		component.warn_if_undefined(info.name, info, scope);

		this.name = info.name;
		component.add_reference(info.name.split('.')[0]);

		if (parent.animation) {
			component.error(this, {
				code: 'duplicate-animation',
				message: "An element can only have one 'animate' directive"
			});
		}

		const block = parent.parent;
		if (!block || block.type !== 'EachBlock' || !block.key) {
			// TODO can we relax the 'immediate child' rule?
			component.error(this, {
				code: 'invalid-animation',
				message: 'An element that uses the animate directive must be the immediate child of a keyed each block'
			});
		}

		(block as any).has_animation = true;

		this.expression = info.expression
			? new Expression(component, this, scope, info.expression, true)
			: null;
	}
}
