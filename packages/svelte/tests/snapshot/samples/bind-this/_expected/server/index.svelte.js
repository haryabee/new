import * as $ from "svelte/internal/server";

export default function Bind_this($$payload, $$props) {
	$$payload.out += `<!--[-->`;
	Foo($$payload, {});
	$$payload.out += `<!--]-->`;
}