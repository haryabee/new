import { cubicOut, cubicInOut } from 'svelte/easing';
import { run_duration, CssAnimationConfig, CssTransitionConfig, TimeableConfig } from 'svelte/internal';

type FlyParams = FadingConfig & { x: number; y: number; rotate: number };
type BlurParams = FadingConfig & { amount: number };
type ScaleParams = FadingConfig & { start: number };
type DrawParams = CssAnimationConfig & { speed: number };
type FadingConfig = CssAnimationConfig & { opacity: number };
type MarkedCrossFadeConfig = TimeableConfig & { key: any };
type CrossFadeConfig = TimeableConfig & { fallback(node: Element, params: TimeableConfig, intro: boolean): CssTransitionConfig };
type ElementMap = Map<any, Element>;

export function blur(node: Element, { delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 }: BlurParams): CssTransitionConfig {
	const style = getComputedStyle(node);
	const target_opacity = +style.opacity;
	const f = style.filter === 'none' ? '' : style.filter;
	const od = target_opacity * (1 - opacity);
	return {
		delay,
		duration,
		easing,
		css: (_t, u) => `opacity: ${target_opacity - od * u}; filter:${f} blur(${u * amount}px);`,
	};
}

export function fade(node: Element, { delay = 0, duration = 400, easing }: CssAnimationConfig): CssTransitionConfig {
	const o = +getComputedStyle(node).opacity;
	return { delay, duration, easing, css: (t) => `opacity: ${t * o};` };
}

export function fly(node: Element, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0, rotate = 0 }: FlyParams ): CssTransitionConfig {
	const style = getComputedStyle(node);
	const target_opacity = +style.opacity;
	const prev = style.transform === 'none' ? '' : style.transform;
	const od = target_opacity * (1 - opacity);
	return {
		delay,
		duration,
		easing,
		css: (_t, u) => `transform: ${prev} translate(${u * x}px, ${u * y}px) rotate(${u * rotate}deg); opacity: ${target_opacity - od * u};`,
	};
}

export function slide(node: Element, { delay = 0, duration = 400, easing = cubicOut }: CssAnimationConfig): CssTransitionConfig {
	const style = getComputedStyle(node);
	const opacity = +style.opacity;
	const height = parseFloat(style.height);
	const padding_top = parseFloat(style.paddingTop);
	const padding_bottom = parseFloat(style.paddingBottom);
	const margin_top = parseFloat(style.marginTop);
	const margin_bottom = parseFloat(style.marginBottom);
	const border_top_width = parseFloat(style.borderTopWidth);
	const border_bottom_width = parseFloat(style.borderBottomWidth);
	return {
		delay,
		duration,
		easing,
		css: (t) => `
			overflow: hidden;
			opacity: ${Math.min(t * 20, 1) * opacity};
			height: ${t * height}px;
			padding-top: ${t * padding_top}px;
			padding-bottom: ${t * padding_bottom}px;
			margin-top: ${t * margin_top}px;
			margin-bottom: ${t * margin_bottom}px;
			border-top-width: ${t * border_top_width}px;
			border-bottom-width: ${t * border_bottom_width}px;`,
	};
}

export function scale(node: Element, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }: ScaleParams): CssTransitionConfig {
	const style = getComputedStyle(node);
	const target_opacity = +style.opacity;
	const transform = style.transform === 'none' ? '' : style.transform;
	const sd = 1 - start;
	const od = target_opacity * (1 - opacity);
	return {
		delay,
		duration,
		easing,
		css: (_t, u) => `transform: ${transform} scale(${1 - sd * u}); opacity: ${target_opacity - od * u};`,
	};
}


export function draw(node: SVGPathElement | SVGGeometryElement, { delay = 0, speed, duration, easing = cubicInOut }: DrawParams): CssTransitionConfig {
	const len = node.getTotalLength();
	if (duration === undefined) duration = speed ? len / speed : 800;
	else duration = run_duration(duration, len);
	return { delay, duration, easing, css: (t, u) => `stroke-dasharray: ${t * len} ${u * len};` };
}

export function crossfade({ delay: default_delay = 0, duration: default_duration = (d) => Math.sqrt(d) * 30, easing: default_easing = cubicOut, fallback }: CrossFadeConfig) {
	const a: ElementMap = new Map();
	const b: ElementMap = new Map();

	const crossfade = (from_node: Element, to_node: Element, { delay = default_delay, easing = default_easing, duration = default_duration }: TimeableConfig ) => {
		const from = from_node.getBoundingClientRect();
		const to = to_node.getBoundingClientRect();
		const dx = from.left - to.left;
		const dy = from.top - to.top;
		const dw = from.width / to.width;
		const dh = from.height / to.height;
		const { transform, opacity } = getComputedStyle(to_node);
		const op = +opacity;
		const prev = transform === 'none' ? '' : transform;
		return {
			delay,
			easing,
			duration: run_duration(duration, Math.sqrt(dx * dx + dy * dy)),
			css: (t, u) => `
				opacity: ${t * op};
				transform-origin: top left;
				transform: ${prev} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`,
		} as CssTransitionConfig;
	};
	
	const transition = (a: ElementMap, b: ElementMap, is_intro: boolean) => ( to_node: Element, params: MarkedCrossFadeConfig ) => {
		const { key } = params;
		a.set(key, to_node);
		if (b.has(key)) {
			const from_node = b.get(key);
			b.delete(key);
			return crossfade(from_node, to_node, params);
		} else {
			return () => {
				if (b.has(key)) {
					const from_node = b.get(key);
					b.delete(key);
					return crossfade(from_node, to_node, params);
				} else {
					a.delete(key);
					return fallback && fallback(to_node, params, is_intro);
				}
			};
		}
	};

	return [transition(b, a, false), transition(a, b, true)];
}
