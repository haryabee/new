import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

const __DECLARED_ASSET_0__ = "__VITE_ASSET__2AM7_y_a__ 1440w, __VITE_ASSET__2AM7_y_b__ 960w";
const __DECLARED_ASSET_1__ = "__VITE_ASSET__2AM7_y_c__ 1440w, __VITE_ASSET__2AM7_y_d__ 960w";
const __DECLARED_ASSET_2__ = "__VITE_ASSET__2AM7_y_e__ 1440w, __VITE_ASSET__2AM7_y_f__ 960w";
const __DECLARED_ASSET_3__ = "__VITE_ASSET__2AM7_y_g__";
const a = 1;
const b = 2;
var root = $.template(`<picture><source srcset="${$.escape(__DECLARED_ASSET_0__, true)}" type="image/avif"> <source srcset="${$.escape(__DECLARED_ASSET_1__, true)}" type="image/webp"> <source srcset="${$.escape(__DECLARED_ASSET_2__, true)}" type="image/png"> <img src="${$.escape(__DECLARED_ASSET_3__, true)}" alt="production test" width="${1440}" height="${1440}"></picture> <p>${$.escape(a ?? "")} + ${$.escape(b ?? "")} = ${$.escape(a + b ?? "")}</p>`, 1);

export default function Inline_module_vars($$anchor) {
	var fragment = root();
	var p = $.sibling($.first_child(fragment), 2);

	$.append($$anchor, fragment);
}