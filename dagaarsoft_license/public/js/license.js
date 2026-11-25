/* DagaarSoft License box (desk). Opened from the user menu, and automatically on first open and
   every hour while a payment is due or the site is read-only. */
(function () {
	const POPUP_STATES = ["Reminder", "Grace", "Read Only", "Suspended"];
	const HOUR = 60 * 60 * 1000;
	const DAY = 24 * HOUR;
	// Active with an amount due = the paid period ends soon: a gentle reminder once a day, with "Renew now".
	const renewing = (d) => d && d.state === "Active" && Number(d.amount) > 0;
	const LABEL = {
		Free: ["Liisan Bilaash", "Free License", "ok"], Active: ["Shaqaynaya", "Active", "ok"],
		Reminder: ["Lacag-bixin", "Payment Due", "warn"], Grace: ["Dib u dhac", "Overdue", "warn"],
		"Read Only": ["Akhris-keliya", "Read Only", "bad"], Suspended: ["La joojiyay", "Suspended", "bad"],
	};
	const DEFAULT_MSG = {
		Free: ["Liisan bilaash ah oo Dagaar Technology.", "Free license from Dagaar Technology."],
		Active: ["Adeeggaagu wuu shaqaynayaa.", "Your service is active."],
		Reminder: ["Fadlan bixi lacagta si adeeggu u sii socdo.", "Please pay to keep your service running."],
		Grace: ["Lacag-bixintu waa dib u dhacday. Fadlan bixi.", "Payment is overdue. Please pay."],
		"Read Only": ["Nidaamku waa akhris-keliya ilaa lacagta la bixiyo.", "Read-only until payment is made."],
		Suspended: ["Adeegga waa la joojiyay ilaa lacagta la bixiyo.", "Service suspended until payment is made."],
	};
	// Dates the client sees: 20 Nov 2026
	const short_date = (v) => {
		if (!v) return "";
		const d = new Date(String(v).slice(0, 10) + "T00:00:00");
		return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
	};
	const css = `
	.dsl-modal .modal-dialog{max-width:700px;width:90vw}
	.dsl-modal .modal-content{border-radius:18px;overflow:hidden;border:0;box-shadow:0 24px 70px rgba(0,0,0,.3)}
	.dsl-modal .modal-header{display:none}.dsl-modal .modal-body{padding:0}
	.dsl-head{display:flex;align-items:center;gap:18px;padding:22px 26px;background:var(--subtle-fg,#f4f6fa);border-bottom:1px solid var(--border-color)}
	.dsl-icon{width:64px;height:64px;border-radius:14px;background:#dbe8fb;display:flex;align-items:center;justify-content:center;flex:none}
	.dsl-icon img{width:44px;height:44px;border-radius:50%}
	.dsl-bar{width:1px;align-self:stretch;background:var(--border-color)}
	.dsl-title{font-size:24px;font-weight:700;color:var(--heading-color);line-height:1.2}
	.dsl-sub{font-size:15px;color:var(--text-muted);margin-top:4px}
	.dsl-x{margin-left:auto;align-self:flex-start;background:none;border:0;font-size:26px;line-height:1;color:var(--text-muted);cursor:pointer}
	.dsl-body{padding:22px 26px}
	.dsl-grid{display:grid;grid-template-columns:1.4fr 1fr 1.2fr;border:1px solid var(--border-color);border-radius:12px;background:var(--subtle-fg,#f7f9fc)}
	.dsl-grid>div{padding:14px 18px}.dsl-grid>div+div{border-left:1px solid var(--border-color)}
	.dsl-k{font-size:13px;color:var(--text-muted)}.dsl-v{font-size:18px;font-weight:700;color:var(--heading-color);margin-top:4px}
	.dsl-f{font-size:13px;color:var(--text-muted);margin-top:3px}.dsl-f:before{content:"✓ ";color:#2FB84A}
	.dsl-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:8px;font-weight:700;font-size:14px;margin-top:4px}
	.dsl-pill.ok{background:#dcf5e3;color:#1c7a36}.dsl-pill.warn{background:#ffe8c2;color:#9a5a00}.dsl-pill.bad{background:#fde0de;color:#b3261e}
	.dsl-msg{font-size:15px;line-height:1.6;margin:18px 0 0;color:var(--text-color)}.dsl-msg.en{color:var(--text-muted);margin-top:8px}
	.dsl-due{margin-top:14px;font-size:15px}.dsl-due b{color:#F28C0F;font-size:18px}
	.dsl-pay{display:none;margin-top:16px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
	.dsl-pay.on{display:grid}.dsl-pay button{border:0;border-radius:10px;padding:12px;font-weight:700;background:#2FB84A;color:#fff}
	.dsl-help{display:flex;gap:10px;align-items:center;border-top:1px solid var(--border-color);margin-top:18px;padding-top:14px;color:var(--text-muted);font-size:14px}
	.dsl-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 26px;border-top:1px solid var(--border-color);flex-wrap:wrap}
	.dsl-foot .btn{padding:10px 20px;font-weight:600;border-radius:10px;font-size:15px}
	@media (max-width:560px){.dsl-grid{grid-template-columns:1fr}.dsl-grid>div+div{border-left:0;border-top:1px solid var(--border-color)}.dsl-title{font-size:20px}}`;

	function esc(s) { return frappe.utils.escape_html(s == null ? "" : String(s)); }

	function render(d) {
		const [so, en, tone] = LABEL[d.state] || LABEL.Free;
		const msg = DEFAULT_MSG[d.state] || DEFAULT_MSG.Free;
		// audience false: the payment message is not for this user (only the status is shown)
		const quiet = d.audience === false;
		const renew = !quiet && renewing(d);
		const due = !quiet && (POPUP_STATES.includes(d.state) || renew);
		const amount = d.amount ? `${esc(d.currency || "")} ${Number(d.amount).toFixed(2)}` : "";
		const logo = "/assets/dagaarsoft_license/images/logo.png";
		return `<div class="dsl-head">
			<div class="dsl-icon"><img src="${esc(logo)}" alt=""></div><div class="dsl-bar"></div>
			<div><div class="dsl-title">DagaarSoft License</div><div class="dsl-sub">${renew ? "Cusboonaysiin dhow / Renewal soon" : due ? "Lacag-bixin / Payment due" : "Xaaladda liisanka / License status"}</div></div>
			<button class="dsl-x" type="button" aria-label="Close">×</button></div>
		<div class="dsl-body">
			<div class="dsl-grid">
				<div><div class="dsl-k">Product</div><div class="dsl-v">DagaarSoft</div></div>
				<div><div class="dsl-k">Plan</div><div class="dsl-v">${esc((d.plan_features && d.plan_features[0]) || d.plan || en)}</div>${(d.plan_features || []).slice(1).map((f) => `<div class="dsl-f">${esc(f)}</div>`).join("")}</div>
				<div><div class="dsl-k">License Status</div><div class="dsl-pill ${tone}">${esc(en)}</div></div>
			</div>
			${quiet ? "" : `<p class="dsl-msg">${esc(d.message_so || msg[0])}</p>
			<p class="dsl-msg en">${esc(d.message_en || msg[1])}</p>`}
			${amount ? `<div class="dsl-due">Lacagta / Amount: <b>${amount}</b>${d.read_only_until && d.state === "Read Only" ? ` · Akhris-keliya ilaa / Read-only until ${esc(short_date(d.read_only_until))}` : ""}</div>` : ""}
			${d.can_pay === false ? (quiet ? "" : `<p class="dsl-msg en">Lacag-bixinta waxa samayn kara maamulaha xisaabaadka. / Only your accounts manager can pay.</p>`) :
				`<div class="dsl-pay">${(d.methods || []).map((m) => `<button type="button" data-m="${esc(m)}">${esc(m)}</button>`).join("")}</div>`}
			<div class="dsl-help"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><span>Caawimaad / Help: ${esc(d.contact || "Dagaar Technology")}</span></div>
		</div>
		<div class="dsl-foot">
			${due && d.can_pay !== false ? `<button class="btn btn-primary dsl-activate" type="button">${renew ? "Cusboonaysii / Renew" : "Bixi / Pay"}</button>` : ""}
			${d.help_url ? `<button class="btn btn-default dsl-contact" type="button">La xidhiidh Dagaar</button>` : ""}
			<button class="btn btn-default dsl-close" type="button">Xidh / Close</button>
		</div>`;
	}

	let dialog = null;
	function show(data) {
		const open = (d) => {
			if (!document.getElementById("dsl-css")) $("<style id='dsl-css'>").text(css).appendTo("head");
			if (dialog) dialog.hide();
			dialog = new frappe.ui.Dialog({ title: "DagaarSoft License" });
			dialog.$wrapper.addClass("dsl-modal");
			dialog.$body.html(render(d));
			dialog.$body.find(".dsl-x, .dsl-close").on("click", () => dialog.hide());
			dialog.$body.find(".dsl-activate").on("click", () => dialog.$body.find(".dsl-pay").addClass("on"));
			dialog.$body.find(".dsl-pay button").on("click", (e) => {
				if (!d.pay_url) return frappe.msgprint(__("Payment will be available once your site is connected to Dagaar. Please contact Dagaar Technology."));
				// open the window now (pop-up blockers), then send it to the signed link
				const win = window.open("about:blank", "dagaar_pay", "width=480,height=760");
				frappe.call({
					method: "dagaarsoft_license.api.pay_link", args: { method: $(e.currentTarget).data("m") },
					callback: (r) => { if (win) win.location = r.message; else window.open(r.message, "dagaar_pay", "width=480,height=760"); },
					error: () => { if (win) win.close(); },
				});
			});
			dialog.$body.find(".dsl-contact").on("click", () => window.open(d.help_url, "_blank"));
			dialog.show();
		};
		if (data) return open(data);
		frappe.call("dagaarsoft_license.api.status").then((r) => open(r.message || {}));
	}

	// Pop-ups are counted on the server (twice a day, 4 hours apart, the first right after signing in),
	// so clearing the browser cache does not show the box again.
	function maybe_popup(signed_in) {
		const d = frappe.boot && frappe.boot.dagaarsoft_license;
		if (!d || !(POPUP_STATES.includes(d.state) || renewing(d))) return;
		frappe.call({ method: "dagaarsoft_license.api.popup_check", args: { signed_in: signed_in ? 1 : 0 } })
			.then((r) => {
				const m = r.message || {};
				if (!m.show) return;
				frappe.boot.dagaarsoft_license = m.license;
				show(m.license);
			});
	}

	// The payment page tells us when the payment went through: reload so the site is usable at once.
	window.addEventListener("message", (e) => { if (e.data === "dagaar-paid") setTimeout(() => location.reload(), 1500); });

	window.dagaarsoft_license = { show: () => show() };
	$(document).on("app_ready", () => {
		const d = frappe.boot && frappe.boot.dagaarsoft_license;
		setTimeout(() => maybe_popup(!!(d && d.show_now)), 1500);
		setInterval(() => maybe_popup(false), 15 * 60 * 1000);
	});
})();
