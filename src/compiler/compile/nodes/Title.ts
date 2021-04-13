import Node from './shared/Node';
import map_children, { Children } from './shared/map_children';
import Component from '../Component';
import TemplateScope from './shared/TemplateScope';
import { TemplateNode } from '../../interfaces';

export default class Title extends Node {
	type: 'Title';
	children: Children;
	should_cache: boolean;

	constructor(component: Component, parent: Node, scope: TemplateScope, info: TemplateNode) {
		super(component, parent, scope, info);
		this.children = map_children(component, parent, scope, info.children);

		if (info.attributes.length > 0) {
			component.error(info.attributes[0], {
				code: 'illegal-attribute',
				message: '<title> cannot have attributes'
			});
			return;
		}

		info.children.forEach(child => {
			if (child.type !== 'Text' && child.type !== 'MustacheTag') {
				return component.error(child, {
					code: 'illegal-structure',
					message: '<title> can only contain text and {tags}'
				});
			}
		});

		this.should_cache = info.children.length === 1
			? (
				info.children[0].type !== 'Identifier' ||
				scope.names.has(info.children[0].name)
			)
			: true;
	}
}
