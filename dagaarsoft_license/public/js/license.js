/* DagaarSoft License button (desk). While a payment is due or the site is read-only, a coloured button drops
   into the middle of the top bar on every page load and every 30 minutes, and goes up again after a few
   seconds unless touched. A click opens the card (details + Pay) under it. The user menu item opens it too. */
(function () {
	const DUE_STATES = ["Reminder", "Grace", "Read Only", "Suspended"];
	const VERSION = "1.2.4";
	const VISIBLE_MS = 8000, EVERY_MS = 30 * 60 * 1000;
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
	.dsl-pill{position:fixed;left:50%;top:calc((var(--navbar-height,48px) - 34px) / 2);z-index:1031;display:flex;align-items:center;gap:8px;
		height:34px;padding:0 16px 0 13px;border:0;border-radius:17px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;
		color:#fff;background:#d63a3a;box-shadow:0 6px 18px rgba(0,0,0,.25);
		transform:translate(-50%,-160%);opacity:0;pointer-events:none;
		transition:transform .55s cubic-bezier(.34,1.56,.64,1), opacity .3s ease}
	.dsl-pill.on{transform:translate(-50%,0);opacity:1;pointer-events:auto}
	.dsl-pill i{width:8px;height:8px;border-radius:50%;background:#fff;flex:none;animation:dsl-blink 1.4s ease-in-out infinite}
	.dsl-pill.warn{background:#f5a524;color:#3b2a00}.dsl-pill.warn i{background:#3b2a00}
	.dsl-pill.info{background:#2f6fde}.dsl-pill.ok{background:#2FB84A}
	@keyframes dsl-blink{50%{opacity:.35}}
	.dsl-card{position:fixed;left:50%;margin-left:-170px;top:var(--navbar-height,48px);z-index:1019;width:340px;max-width:calc(100vw - 16px);
		background:var(--card-bg,#fff);color:var(--text-color);border:1px solid var(--border-color);border-top:0;
		border-radius:0 0 12px 12px;box-shadow:0 14px 32px rgba(0,0,0,.2);overflow:hidden;
		transform:translateY(-110%);opacity:0;transition:transform .35s ease, opacity .35s ease;pointer-events:none}
	.dsl-card.on{transform:none;opacity:1;pointer-events:auto}
	@media (max-width:600px){.dsl-card{left:8px;margin-left:0}.dsl-pill{top:calc(var(--navbar-height,48px) + 8px)}}
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

	function pill_label(d) {
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
			<div class="dsl-t"><i></i>${esc(t(so, en))}</div>
			${text ? `<div class="dsl-s">${esc(text)}</div>` : ""}
			${rows.map(([k, v]) => `<div class="dsl-row"><span>${esc(k)}</span><b>${v}</b></div>`).join("")}
			${pay}
			<div class="dsl-help">${t("Caawimaad", "Help")}: ${esc(d.contact || "Dagaar Technology")}${d.help_url ? ` · <a class="dsl-contact">${t("La xidhiidh", "Contact")}</a>` : ""}</div>
		</div>`;
	}

	let $card = null, $pill = null, data = null, hide_timer = null;

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
			$pill = $('<button type="button" class="dsl-pill" aria-label="DagaarSoft License"></button>').appendTo("body");
			$card = $('<div class="dsl-card" role="dialog" aria-label="DagaarSoft License"></div>').appendTo("body");
			// The mouse on the button keeps it; a click opens the card under it.
			$pill.on("mouseenter", () => clearTimeout(hide_timer))
				.on("mouseleave", () => !card_open() && hide_later(2500))
				.on("click", () => (card_open() ? close_card() : open_card()));
			$card.on("click", ".dsl-x", () => close_card());
			$card.on("click", ".dsl-go", () => {
				const methods = data.methods || [];
				if (methods.length === 1) return pay(methods[0]);
				$card.find(".dsl-go").hide(); $card.find(".dsl-pay").css("display", "flex");
			});
			$card.on("click", ".dsl-pay button", (e) => pay($(e.currentTarget).data("m")));
			$card.on("click", ".dsl-contact", () => window.open(data.help_url, "_blank"));
			$(document).on("mousedown", (e) => {
				if (card_open() && !$(e.target).closest(".dsl-card, .dsl-pill").length) close_card();
			});
		}
		const on = (el) => (el.hasClass("on") ? " on" : "");
		$pill.attr("class", `dsl-pill ${tone(d)}${on($pill)}`).html(`<i></i><span>${esc(pill_label(d))}</span>`);
		$card.attr("class", `dsl-card ${tone(d)}${on($card)}`).html(card_html(d));
	}

	const card_open = () => $card && $card.hasClass("on");
	const hide_later = (ms) => { clearTimeout(hide_timer); hide_timer = setTimeout(hide_pill, ms); };
	function hide_pill() { if (!card_open() && !$pill.is(":hover")) $pill.removeClass("on"); }
	function drop_pill(ms) {
		requestAnimationFrame(() => requestAnimationFrame(() => $pill.addClass("on")));
		hide_later(ms);
	}
	function open_card() {
		clearTimeout(hide_timer);
		$pill.addClass("on");
		$card.addClass("on");
	}
	function close_card() {
		$card.removeClass("on");
		$card.find(".dsl-pay").hide(); $card.find(".dsl-go").show();
		hide_later(1500);
	}

	// The button drops from the top into the bar, stays a few seconds, then goes up again unless touched.
	function peek(d) {
		if (card_open()) return;
		build(d);
		drop_pill(VISIBLE_MS);
	}

	// User menu: show the button and open the card.
	function show(d) {
		const go = (x) => { build(x); requestAnimationFrame(() => requestAnimationFrame(open_card)); };
		if (d) return go(d);
		frappe.call("dagaarsoft_license.api.status").then((r) => go(r.message || {}));
	}

	// On every page load, then every 30 minutes (fresh status each time).
	function maybe_peek(fresh) {
		const d = boot();
		if (!fresh) return wants_card(d) && peek(d);
		frappe.call({ method: "dagaarsoft_license.api.status", args: { v: VERSION } }).then((r) => {
			const x = r.message;
			if (!x) return;
			frappe.boot.dagaarsoft_license = x;
			if (wants_card(x)) peek(x);
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
		setTimeout(() => maybe_peek(false), 1500);
		setInterval(() => maybe_peek(true), EVERY_MS);
	});
})();
