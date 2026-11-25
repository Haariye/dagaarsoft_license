/* DagaarSoft License card (desk). While a payment is due or the site is read-only, a small card drops down
   from the top bar for 6 seconds on every page load and for 5 seconds every 10 minutes, then hides. It stays
   while the mouse is on it; a click keeps it open. The user menu item opens it too. */
(function () {
	const DUE_STATES = ["Reminder", "Grace", "Read Only", "Suspended"];
	const VERSION = "1.2.3";
	const FIRST_MS = 6000, AGAIN_MS = 5000, EVERY_MS = 10 * 60 * 1000;
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
	.dsl-card{position:fixed;right:90px;top:var(--navbar-height,48px);z-index:1019;width:340px;max-width:calc(100vw - 16px);
		background:var(--card-bg,#fff);color:var(--text-color);border:1px solid var(--border-color);border-top:0;
		border-radius:0 0 12px 12px;box-shadow:0 14px 32px rgba(0,0,0,.2);overflow:hidden;
		transform:translateY(-110%);opacity:0;transition:transform .35s ease, opacity .35s ease;pointer-events:none}
	.dsl-card.on{transform:none;opacity:1;pointer-events:auto}
	@media (max-width:600px){.dsl-card{right:8px}}
	.dsl-card .dsl-top{height:4px}.dsl-card.ok .dsl-top{background:#2FB84A}.dsl-card.info .dsl-top{background:#2f6fde}
	.dsl-card.warn .dsl-top{background:#f5a524}.dsl-card.bad .dsl-top{background:#d63a3a}
	.dsl-in{padding:14px 16px 16px;position:relative}
	.dsl-x{position:absolute;right:10px;top:8px;background:none;border:0;font-size:18px;line-height:1;color:var(--text-muted);cursor:pointer}
	.dsl-t{font-weight:700;font-size:14px;color:var(--heading-color);padding-right:20px;display:flex;align-items:center;gap:8px}
	.dsl-t i{width:8px;height:8px;border-radius:50%;flex:none}
	.dsl-card.ok .dsl-t i{background:#2FB84A}.dsl-card.info .dsl-t i{background:#2f6fde}
	.dsl-card.warn .dsl-t i{background:#f5a524}.dsl-card.bad .dsl-t i{background:#d63a3a}
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
	// The card is for due states (people not meant for the payment message only see Read only / Suspended)
	const wants_card = (d) => d && (quiet(d) ? ["Read Only", "Suspended"].includes(d.state)
		: DUE_STATES.includes(d.state) || renewing(d));
	const tone = (d) => (renewing(d) ? "info" : TONE[d.state] || "ok");
	const amount = (d) => (d.amount ? `${esc(d.currency || "")} ${Number(d.amount).toFixed(2)}` : "");

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
			<div class="dsl-t"><i></i>${esc(t(so, en))}</div>
			${text ? `<div class="dsl-s">${esc(text)}</div>` : ""}
			${rows.map(([k, v]) => `<div class="dsl-row"><span>${esc(k)}</span><b>${v}</b></div>`).join("")}
			${pay}
			<div class="dsl-help">${t("Caawimaad", "Help")}: ${esc(d.contact || "Dagaar Technology")}${d.help_url ? ` · <a class="dsl-contact">${t("La xidhiidh", "Contact")}</a>` : ""}</div>
		</div>`;
	}

	let $card = null, data = null, pinned = false, close_timer = null, peek_timer = null;

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
			$card.on("mouseenter", () => { clearTimeout(close_timer); clearTimeout(peek_timer); })
				.on("mouseleave", () => !pinned && close_soon(1500));
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
				if (pinned && $card.hasClass("on") && !$(e.target).closest(".dsl-card").length) close(true);
			});
		}
		$card.attr("class", `dsl-card ${tone(d)}${$card.hasClass("on") ? " on" : ""}`).html(card_html(d));
	}

	function open(pin) {
		clearTimeout(close_timer);
		if (pin) { pinned = true; clearTimeout(peek_timer); }
		$card.addClass("on");
	}
	function close(force) {
		if (pinned && !force) return;
		pinned = false; clearTimeout(peek_timer); clearTimeout(close_timer);
		if (!$card) return;
		$card.removeClass("on");
		$card.find(".dsl-pay").hide(); $card.find(".dsl-go").show();
	}
	const close_soon = (ms) => { clearTimeout(close_timer); close_timer = setTimeout(() => close(false), ms || 400); };

	// Drops down from the top bar for a few seconds, then hides (stays while the mouse is on it).
	function peek(d, ms) {
		if (pinned) return;
		build(d);
		requestAnimationFrame(() => open(false));
		clearTimeout(peek_timer);
		peek_timer = setTimeout(() => { if (!pinned && !$card.is(":hover")) close(false); }, ms);
	}

	// User menu: open the card and keep it open.
	function show(d) {
		const go = (x) => { build(x); requestAnimationFrame(() => open(true)); };
		if (d) return go(d);
		frappe.call("dagaarsoft_license.api.status").then((r) => go(r.message || {}));
	}

	// On every page load for 6 seconds, then every 10 minutes for 5 seconds (fresh status each time).
	function maybe_peek(ms, fresh) {
		const d = boot();
		if (!fresh) return wants_card(d) && peek(d, ms);
		frappe.call({ method: "dagaarsoft_license.api.status", args: { v: VERSION } }).then((r) => {
			const x = r.message;
			if (!x) return;
			frappe.boot.dagaarsoft_license = x;
			if (wants_card(x)) peek(x, ms);
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
		setTimeout(() => maybe_peek(FIRST_MS, false), 1500);
		setInterval(() => maybe_peek(AGAIN_MS, true), EVERY_MS);
	});
})();
