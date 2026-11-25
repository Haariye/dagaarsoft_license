/* DagaarSoft License corner (desk). A small tab hangs on the right edge while a payment is due or the
   site is read-only. Hovering or clicking it opens a small card; after sign-in (and at most twice a day,
   counted on the server) the card opens by itself for a few seconds. The user menu item opens the card. */
(function () {
	const DUE_STATES = ["Reminder", "Grace", "Read Only", "Suspended"];
	const PEEK_MS = 6000;
	// Active with an amount due = the paid period ends soon: "Renew".
	const renewing = (d) => d && d.state === "Active" && Number(d.amount) > 0;
	const somali = () => String((frappe.boot && frappe.boot.lang) || "").startsWith("so");
	const t = (so, en) => (somali() ? so : en);
	const TONE = { Free: "ok", Active: "ok", Reminder: "warn", Grace: "warn", "Read Only": "bad", Suspended: "bad" };
	const TITLE = {
		Free: ["Liisan bilaash", "Free license"], Active: ["Adeeggu wuu shaqaynayaa", "Service active"],
		Reminder: ["Lacag-bixin ayaa la gaadhay", "Payment due"], Grace: ["Lacag-bixintu way dib u dhacday", "Payment overdue"],
		"Read Only": ["Akhris-keliya", "Read-only mode"], Suspended: ["Adeegga waa la joojiyay", "Service suspended"],
	};
	const DEFAULT_MSG = {
		Free: ["Liisan bilaash ah oo Dagaar Technology.", "Free license from Dagaar Technology."],
		Active: ["Adeeggaagu wuu shaqaynayaa.", "Your service is active."],
		Reminder: ["Fadlan bixi lacagta si adeeggu u sii socdo.", "Please pay to keep your service running."],
		Grace: ["Lacag-bixintu waa dib u dhacday. Fadlan bixi.", "Payment is overdue. Please pay."],
		"Read Only": ["Waad arki kartaa xogta laakiin wax ma kaydin kartid ilaa lacagta la bixiyo.", "You can view data but not save until payment is made."],
		Suspended: ["Adeegga waa la joojiyay ilaa lacagta la bixiyo.", "Service suspended until payment is made."],
	};
	const short_date = (v) => {
		if (!v) return "";
		const d = new Date(String(v).slice(0, 10) + "T00:00:00");
		return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
	};
	const day_month = (v) => short_date(v).split(" ").slice(0, 2).join(" ");
	const css = `
	.dsl-tab{position:fixed;right:0;top:calc(var(--navbar-height,48px) + 18px);z-index:1029;display:flex;align-items:center;gap:7px;
		height:34px;padding:0 14px 0 12px;border-radius:17px 0 0 17px;font-weight:600;font-size:12px;cursor:pointer;
		background:var(--card-bg,#fff);border:1px solid var(--border-color);border-right:0;box-shadow:0 4px 14px rgba(0,0,0,.14);
		transition:transform .25s ease, opacity .25s ease}
	.dsl-tab i{width:8px;height:8px;border-radius:50%;flex:none}
	.dsl-tab.ok{color:#1c7a36}.dsl-tab.ok i{background:#2FB84A}
	.dsl-tab.info{color:#2f6fde}.dsl-tab.info i{background:#2f6fde}
	.dsl-tab.warn{color:#9a5a00}.dsl-tab.warn i{background:#f5a524}
	.dsl-tab.bad{background:#d63a3a;border-color:#d63a3a;color:#fff}.dsl-tab.bad i{background:#fff}
	.dsl-tab.hide{transform:translateX(110%);opacity:0}
	.dsl-card{position:fixed;right:0;top:calc(var(--navbar-height,48px) + 18px);z-index:1030;width:330px;max-width:calc(100vw - 16px);
		background:var(--card-bg,#fff);color:var(--text-color);border:1px solid var(--border-color);border-right:0;
		border-radius:12px 0 0 12px;box-shadow:0 12px 32px rgba(0,0,0,.2);overflow:hidden;
		transform:translateX(105%);opacity:0;transition:transform .28s ease, opacity .28s ease;pointer-events:none}
	.dsl-card.on{transform:none;opacity:1;pointer-events:auto}
	.dsl-card .dsl-top{height:4px}.dsl-card.ok .dsl-top{background:#2FB84A}.dsl-card.info .dsl-top{background:#2f6fde}
	.dsl-card.warn .dsl-top{background:#f5a524}.dsl-card.bad .dsl-top{background:#d63a3a}
	.dsl-in{padding:14px 16px 16px;position:relative}
	.dsl-x{position:absolute;right:10px;top:8px;background:none;border:0;font-size:18px;line-height:1;color:var(--text-muted);cursor:pointer}
	.dsl-t{font-weight:700;font-size:14px;color:var(--heading-color);padding-right:20px}
	.dsl-s{color:var(--text-muted);font-size:12px;margin:5px 0 10px;line-height:1.45}
	.dsl-row{display:flex;justify-content:space-between;font-size:12px;line-height:22px}.dsl-row b{color:var(--heading-color)}
	.dsl-pay{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
	.dsl-pay button,.dsl-go{flex:1 1 45%;border:0;border-radius:7px;height:32px;font-weight:700;font-size:12px;cursor:pointer}
	.dsl-pay button{background:#2FB84A;color:#fff}
	.dsl-go{width:100%;margin-top:12px;background:var(--heading-color,#1f272e);color:var(--card-bg,#fff)}
	.dsl-help{margin-top:10px;font-size:11px;color:var(--text-muted)}.dsl-help a{color:inherit;text-decoration:underline;cursor:pointer}
	.dsl-toast{position:fixed;right:20px;bottom:20px;z-index:1060;max-width:340px;background:#1f272e;color:#fff;border-radius:8px;
		padding:12px 14px;font-size:13px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .3s}
	.dsl-toast b{color:#ff9b9b}.dsl-toast a{color:#fff;text-decoration:underline;cursor:pointer;margin-left:4px}`;

	const esc = (s) => frappe.utils.escape_html(s == null ? "" : String(s));
	const boot = () => (frappe.boot && frappe.boot.dagaarsoft_license) || null;
	const quiet = (d) => d.audience === false;
	// The tab shows for due states (people not meant for the payment message only see Read only / Suspended)
	const wants_tab = (d) => d && (quiet(d) ? ["Read Only", "Suspended"].includes(d.state)
		: DUE_STATES.includes(d.state) || renewing(d));
	const tone = (d) => (renewing(d) ? "info" : TONE[d.state] || "ok");
	const amount = (d) => (d.amount ? `${esc(d.currency || "")} ${Number(d.amount).toFixed(2)}` : "");

	function tab_label(d) {
		if (renewing(d)) return t("Cusboonaysiin", "Renews") + (d.due_date ? " " + day_month(d.due_date) : "");
		if (d.state === "Reminder") return t("Lacag-bixin", "Payment due") + (d.due_date ? " · " + day_month(d.due_date) : "");
		if (d.state === "Grace") return t("Dib u dhac · Bixi", "Overdue · Pay now");
		if (d.state === "Read Only") return t("Akhris-keliya", "Read only") + (quiet(d) ? "" : " · " + t("Bixi", "Pay"));
		if (d.state === "Suspended") return t("La joojiyay", "Suspended");
		return t("Shaqaynaya", "Active");
	}

	function card_html(d) {
		const [so, en] = renewing(d) ? ["Cusboonaysiin dhow", "Renewal soon"] : TITLE[d.state] || TITLE.Free;
		const msg = DEFAULT_MSG[d.state] || DEFAULT_MSG.Free;
		const text = quiet(d) ? (d.state === "Read Only" || d.state === "Suspended" ? t(msg[0], msg[1]) : "")
			: (somali() ? d.message_so || d.message_en : d.message_en || d.message_so) || t(msg[0], msg[1]);
		const due = !quiet(d) && (DUE_STATES.includes(d.state) || renewing(d));
		const plan = (d.plan_features && d.plan_features[0]) || d.plan || "";
		const rows = [
			plan && [t("Qorshe", "Plan"), esc(plan)],
			!quiet(d) && amount(d) && [t("Lacagta", "Amount"), amount(d)],
			!quiet(d) && d.due_date && [t("Taariikhda", "Due date"), esc(short_date(d.due_date))],
			d.read_only_until && d.state === "Read Only" && [t("Akhris-keliya ilaa", "Read-only until"), esc(short_date(d.read_only_until))],
		].filter(Boolean);
		let pay = "";
		if (due && d.can_pay === false) {
			pay = `<div class="dsl-help">${t("Lacag-bixinta waxa samayn kara maamulaha xisaabaadka.", "Ask your accounts manager to pay.")}</div>`;
		} else if (due) {
			pay = `<button class="dsl-go" type="button">${renewing(d) ? t("Cusboonaysii", "Renew now") : t("Bixi hadda", "Pay now")}</button>
				<div class="dsl-pay" style="display:none">${(d.methods || []).map((m) => `<button type="button" data-m="${esc(m)}">${esc(m)}</button>`).join("")}</div>`;
		} else if (quiet(d) && DUE_STATES.includes(d.state)) {
			pay = `<div class="dsl-help">${t("La xidhiidh maamulaha xisaabaadka.", "Please contact your accounts manager.")}</div>`;
		}
		return `<div class="dsl-top"></div><div class="dsl-in">
			<button class="dsl-x" type="button" aria-label="Close">×</button>
			<div class="dsl-t">${esc(t(so, en))}</div>
			${text ? `<div class="dsl-s">${esc(text)}</div>` : ""}
			${rows.map(([k, v]) => `<div class="dsl-row"><span>${esc(k)}</span><b>${v}</b></div>`).join("")}
			${pay}
			<div class="dsl-help">${t("Caawimaad", "Help")}: ${esc(d.contact || "Dagaar Technology")}${d.help_url ? ` · <a class="dsl-contact">${t("La xidhiidh", "Contact")}</a>` : ""}</div>
		</div>`;
	}

	let $tab = null, $card = null, data = null, pinned = false, close_timer = null, peek_timer = null;

	function ensure_css() {
		if (!document.getElementById("dsl-css")) $("<style id='dsl-css'>").text(css).appendTo("head");
	}

	function pay(method) {
		if (!data.pay_url) return frappe.msgprint(__("Payment will be available once your site is connected to Dagaar. Please contact Dagaar Technology."));
		// open the window now (pop-up blockers), then send it to the signed link
		const win = window.open("about:blank", "dagaar_pay", "width=480,height=760");
		frappe.call({
			method: "dagaarsoft_license.api.pay_link", args: { method },
			callback: (r) => { if (win) win.location = r.message; else window.open(r.message, "dagaar_pay", "width=480,height=760"); },
			error: () => { if (win) win.close(); },
		});
	}

	function build(d) {
		ensure_css();
		data = d;
		if (!$card) {
			$card = $('<div class="dsl-card" role="dialog" aria-label="DagaarSoft License"></div>').appendTo("body");
			$card.on("mouseenter", () => clearTimeout(close_timer)).on("mouseleave", () => !pinned && close_soon());
			$card.on("click", ".dsl-x", () => close(true));
			$card.on("click", ".dsl-go", () => {
				pinned = true; clearTimeout(peek_timer);
				const methods = data.methods || [];
				if (methods.length === 1) return pay(methods[0]);
				$card.find(".dsl-go").hide(); $card.find(".dsl-pay").css("display", "flex");
			});
			$card.on("click", ".dsl-pay button", (e) => pay($(e.currentTarget).data("m")));
			$card.on("click", ".dsl-contact", () => window.open(data.help_url, "_blank"));
			$(document).on("mousedown", (e) => {
				if (pinned && $card.hasClass("on") && !$(e.target).closest(".dsl-card, .dsl-tab").length) close(true);
			});
		}
		$card.attr("class", `dsl-card ${tone(d)}${$card.hasClass("on") ? " on" : ""}`).html(card_html(d));
		if (wants_tab(d)) {
			if (!$tab) {
				$tab = $('<div class="dsl-tab" role="button" tabindex="0"></div>').appendTo("body");
				$tab.on("mouseenter", () => open(false)).on("mouseleave", () => !pinned && close_soon());
				$tab.on("click keydown", (e) => { if (e.type === "click" || e.key === "Enter") open(true); });
			}
			$tab.attr("class", `dsl-tab ${tone(d)}${$card.hasClass("on") ? " hide" : ""}`)
				.html(`<i></i><span>${esc(tab_label(d))}</span>`);
		} else if ($tab) {
			$tab.remove(); $tab = null;
		}
	}

	function open(pin) {
		clearTimeout(close_timer);
		if (pin) { pinned = true; clearTimeout(peek_timer); }
		$card.addClass("on");
		$tab && $tab.addClass("hide");
	}
	function close(force) {
		if (pinned && !force) return;
		pinned = false; clearTimeout(peek_timer);
		$card && $card.removeClass("on");
		$tab && $tab.removeClass("hide");
		if ($card) $card.find(".dsl-pay").hide(), $card.find(".dsl-go").show();
	}
	const close_soon = () => { clearTimeout(close_timer); close_timer = setTimeout(() => close(false), 400); };

	// Opens by itself for a few seconds, then slides back to the tab (unless the mouse is on it).
	function peek(d) {
		build(d);
		open(false);
		clearTimeout(peek_timer);
		peek_timer = setTimeout(() => { if (!pinned && !$card.is(":hover")) close(false); }, PEEK_MS);
	}

	// User menu: open the card pinned.
	function show(d) {
		const go = (x) => { build(x); open(true); };
		if (d) return go(d);
		frappe.call("dagaarsoft_license.api.status").then((r) => go(r.message || {}));
	}

	// Auto-open is counted on the server (twice a day, 4 hours apart, the first right after signing in),
	// so clearing the browser cache does not bring it back.
	function maybe_peek(signed_in) {
		const d = boot();
		if (!d || !(DUE_STATES.includes(d.state) || renewing(d)) || quiet(d)) return;
		frappe.call({ method: "dagaarsoft_license.api.popup_check", args: { signed_in: signed_in ? 1 : 0 } })
			.then((r) => {
				const m = r.message || {};
				if (!m.show) return;
				frappe.boot.dagaarsoft_license = m.license;
				peek(m.license);
			});
	}

	// Read only: a blocked save shows a small corner notice instead of the big message box.
	function toast() {
		ensure_css();
		$(".dsl-toast").remove();
		const d = boot() || {};
		const can = !quiet(d) && d.can_pay !== false;
		const $t = $(`<div class="dsl-toast"><b>${esc(t("Lama kaydin.", "Not saved."))}</b> ${esc(t(
			"Nidaamku waa akhris-keliya ilaa lacagta la bixiyo.", "This site is read-only until the subscription is paid."))}${
			can ? `<a>${esc(t("Bixi", "Pay now"))}</a>` : ""}</div>`).appendTo("body");
		$t.on("click", "a", () => { $t.remove(); show(); });
		setTimeout(() => $t.css("opacity", 0), 6000);
		setTimeout(() => $t.remove(), 6400);
	}
	function hook_msgprint() {
		const orig = frappe.msgprint;
		if (!orig || orig.__dsl) return;
		frappe.msgprint = function (msg, title) {
			const m = msg && typeof msg === "object" ? msg : { message: msg, title };
			const d = boot();
			if (d && ["Read Only", "Suspended"].includes(d.state) && m && String(m.message || "").includes("Read-only until payment")) {
				toast();
				return { hide() {}, $wrapper: $() };
			}
			return orig.apply(this, arguments);
		};
		frappe.msgprint.__dsl = true;
	}

	// The payment page tells us when the payment went through: reload so the site is usable at once.
	window.addEventListener("message", (e) => { if (e.data === "dagaar-paid") setTimeout(() => location.reload(), 1500); });

	window.dagaarsoft_license = { show: () => show() };
	$(document).on("app_ready", () => {
		hook_msgprint();
		const d = boot();
		if (wants_tab(d)) build(d);
		setTimeout(() => maybe_peek(!!(d && d.show_now)), 1500);
		setInterval(() => maybe_peek(false), 15 * 60 * 1000);
	});
})();
