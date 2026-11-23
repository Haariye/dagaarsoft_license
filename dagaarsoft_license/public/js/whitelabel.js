/* DagaarSoft names in the desk instead of ERPNext / Frappe (switch: frappe.boot.dagaarsoft_whitelabel.on).
   Runs before the desk starts: logo, help menu (from boot), translations (__), About box, and the
   texts shown on screen (also those that do not pass through translations). */
(function () {
	const conf = (window.frappe && frappe.boot && frappe.boot.dagaarsoft_whitelabel) || null;
	if (!conf || !conf.on) return;

	const RULES = [
		[/\bFrappe Technologies(?: Pvt\.? Ltd\.?)?/g, "Dagaar Technology"],
		[/\bFrappe Framework\b/g, "DagaarSoft"],
		[/\bFrappe HR\b/g, "DagaarSoft HR"],
		[/\bHRMS\b/g, "DagaarSoft HR"],
		[/\bERPNext\b/g, "DagaarSoft"],
		[/\bFrappe\b/g, "DagaarSoft"],
		[/\bDagaarSoft DagaarSoft\b/g, "DagaarSoft"],
	];
	const QUICK = /ERPNext|Frappe|HRMS/;
	const DEFAULT_LOGO = /^\/assets\/(frappe|erpnext|hrms|healthcare)\/images\/[\w./-]*(logo|favicon)[\w./-]*$/;
	function brand(s) {
		if (typeof s !== "string" || !QUICK.test(s)) return s;
		for (const [rx, to] of RULES) s = s.replace(rx, to);
		return s;
	}
	window.dagaarsoft_brand = brand;

	// Logo: only the standard frappe / erpnext logos are replaced (a site's own logo stays).
	if (!frappe.boot.app_logo_url || DEFAULT_LOGO.test(frappe.boot.app_logo_url)) frappe.boot.app_logo_url = conf.logo;

	// Help menu: the links to the Frappe / ERPNext sites become one "DagaarSoft Support" link.
	const EXTERNAL = /frappe\.io|frappe\.school|erpnext\.com|frappeframework|github\.com\/frappe|discuss\./i;
	const nav = frappe.boot.navbar_settings;
	if (nav && Array.isArray(nav.help_dropdown)) {
		const items = [{ item_label: "DagaarSoft Support", item_type: "Route", route: conf.support, hidden: 0, is_standard: 0 }];
		for (const row of nav.help_dropdown) {
			if (row.item_type === "Route" && EXTERNAL.test(row.route || "")) continue;
			items.push(Object.assign({}, row, { item_label: brand(row.item_label) }));
		}
		nav.help_dropdown = items;
	}

	// Translations: every text that passes through __() (all languages).
	const wrap = (fn) => {
		if (typeof fn !== "function" || fn.__dagaar) return fn;
		const w = function () { return brand(fn.apply(this, arguments)); };
		w.__dagaar = true;
		return w;
	};
	if (window.__) window.__ = wrap(window.__);
	if (frappe._) frappe._ = wrap(frappe._);

	// About box: DagaarSoft and its version.
	function about() {
		const d = new frappe.ui.Dialog({ title: "DagaarSoft" });
		const esc = (s) => frappe.utils.escape_html(s == null ? "" : String(s));
		d.$body.html(`<div style="display:flex;gap:16px;align-items:center;margin-bottom:12px">
				<img src="${esc(conf.logo)}" alt="DagaarSoft" style="width:56px;height:56px;border-radius:12px">
				<div><div style="font-size:20px;font-weight:700">DagaarSoft</div>
				<div class="text-muted dsl-about-version"></div></div></div>
			<p>${esc(__("Business software by Dagaar Technology"))}</p>
			<p>${esc(__("Website"))}: <a href="${esc(conf.website)}" target="_blank" rel="noopener">${esc(conf.website.replace(/^https?:\/\//, ""))}</a></p>
			<p>${esc(__("Support"))}: <a href="${esc(conf.support)}" target="_blank" rel="noopener">${esc(conf.support.replace(/^https?:\/\//, ""))}</a></p>
			<hr><h4>${esc(__("Installed Apps"))}</h4><div class="dsl-about-apps text-muted">${esc(__("Loading versions..."))}</div>
			<hr><p class="text-muted">&copy; Dagaar Technology</p>`);
		frappe.call({ method: "frappe.utils.change_log.get_versions" }).then((r) => {
			const v = r.message || {};
			const main = v.erpnext || v.frappe || {};
			d.$body.find(".dsl-about-version").text(main.version ? "Version " + main.version : "");
			d.$body.find(".dsl-about-apps").html(Object.keys(v).sort().map((app) => {
				const title = (conf.titles && conf.titles[app]) || brand(v[app].title || app);
				return `<p><b>${esc(title)}:</b> v${esc(v[app].version)}</p>`;
			}).join(""));
		});
		d.show();
	}
	frappe.provide("frappe.ui.misc");
	frappe.provide("frappe.ui.toolbar");
	frappe.ui.misc.about = about;
	frappe.ui.toolbar.show_about = about;
	$(document).on("app_ready", () => {
		frappe.ui.misc.about = about;
		frappe.ui.toolbar.show_about = about;
		$(".navbar-brand .app-logo").attr("alt", "DagaarSoft");
	});

	// Texts on screen that do not pass through __ (names inside messages, workspace titles, ...).
	const SKIP = "input,textarea,select,script,style,pre,code,[contenteditable=''],[contenteditable='true'],.ql-editor,.ace_editor,.CodeMirror,.cm-editor,.control-value,.like-disabled-input";
	const ATTRS = ["title", "placeholder", "alt", "aria-label", "data-original-title"];
	function fixText(node) {
		const v = node.nodeValue;
		if (!v || !QUICK.test(v)) return;
		const p = node.parentElement;
		if (p && p.closest && p.closest(SKIP)) return;
		const nv = brand(v);
		if (nv !== v) node.nodeValue = nv;
	}
	function fixAttrs(el) {
		for (const a of ATTRS) {
			const v = el.getAttribute && el.getAttribute(a);
			if (v && QUICK.test(v)) el.setAttribute(a, brand(v));
		}
	}
	function fixTree(root) {
		if (!root) return;
		if (root.nodeType === 3) return fixText(root);
		if (root.nodeType !== 1 && root.nodeType !== 9) return;
		if (root.nodeType === 1) {
			if (root.closest(SKIP)) return;
			if (!QUICK.test(root.textContent || "") && !root.querySelector("[title],[placeholder],[alt],[aria-label]")) { fixAttrs(root); return; }
			fixAttrs(root);
		}
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		let n;
		while ((n = walker.nextNode())) fixText(n);
		if (root.querySelectorAll) root.querySelectorAll("[title],[placeholder],[alt],[aria-label],[data-original-title]").forEach(fixAttrs);
	}
	function start() {
		if (document.title && QUICK.test(document.title)) document.title = brand(document.title);
		fixTree(document.body);
		new MutationObserver((list) => {
			for (const m of list) {
				if (m.type === "characterData") fixText(m.target);
				else if (m.type === "attributes") fixAttrs(m.target);
				else m.addedNodes.forEach(fixTree);
			}
		}).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
	}
	if (document.body) start();
	else document.addEventListener("DOMContentLoaded", start);
})();
