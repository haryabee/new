import { b, x } from 'code-red';
import Block from '../../Block';
import Action from '../../../nodes/Action';
import { sanitize_name } from '../../../utils/stringify';
export default function add_actions(
	block: Block,
	target: string,
	actions: Action[]
) {
	actions.forEach(action => add_action(block, target, action));
}
export function add_action(block: Block, target: string, action: Action) {
	const { expression } = action;
	let snippet;
	let dependencies;

	if (expression) {
		snippet = expression.manipulate(block);
		dependencies = expression.dynamic_dependencies();
	}

	const id = block.get_unique_name(`${sanitize_name(action.name)}_action`);
	block.add_variable(id);

	const fn = block.renderer.reference(action.name);

	const subscriber = x`${id} = ${fn}.call(null, ${target}, ${snippet})`;

	block.event_listeners.push(subscriber);

	if (dependencies && dependencies.length > 0) {
		let condition = x`${id} && "function" === typeof ${id}.update`;

		if (dependencies.length > 0) {
			condition = x`${block.renderer.dirty(dependencies)} && ${condition}`;
		}

		block.chunks.update.push(
			b`if (${condition}) ${id}.update.call(null, ${snippet});`
		);
	}
}