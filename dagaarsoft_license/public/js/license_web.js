/* DagaarSoft License on the sign-in page: shown only when the site is read-only or closed. */
(function () {
	// The older sign-in notice (from before this app) must never show next to this one.
	function dropOld() { var o = document.getElementById("dagaar-service"); if (o) o.remove(); }
	try { new MutationObserver(dropOld).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
	document.addEventListener("DOMContentLoaded", dropOld);
	var p = location.pathname.replace(/\/$/, "");
	if (p !== "/login" && p !== "") return;
	function el(t, css, txt) { var e = document.createElement(t); if (css) e.style.cssText = css; if (txt) e.textContent = txt; return e; }
	var ICON_PAY = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>';
	var ICON_HELP = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>';
	function show(d) {
		if (document.getElementById("dagaarsoft-license")) return;
		var closed = d.state === "Suspended";
		var so = d.message_so || (closed ? "Nidaamku wuxuu si otomaatig ah oo ku-meel-gaadh ah u hakiyey adeeggaaga ilaa laga bixiyo lacagta kugu maqan. Adeeggaagu si toos ah ayuu dib ugu furmi doonaa marka lacag-bixinta la xaqiijiyo."
			: "Nidaamku hadda waa akhris-keliya: wax waad arki kartaa, laakiin wax lama beddeli karo ilaa lacagta kugu maqan la bixiyo.");
		var en = d.message_en || (closed ? "The system has automatically and temporarily suspended your access until the outstanding balance is paid. Your access will be restored automatically once payment is confirmed."
			: "The system is read-only: you can view everything but cannot make changes until the outstanding balance is paid.");
		var veil = el("div", "position:fixed;inset:0;background:rgba(9,20,35,.62);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;overflow:auto");
		veil.id = "dagaarsoft-license";
		var card = el("div", "width:700px;max-width:90vw;background:#fff;color:#14284B;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;margin:auto");
		var head = el("div", "background:#0E2A5C;color:#fff;display:flex;align-items:center;gap:20px;padding:20px 28px");
		var logo = el("img", "width:64px;height:64px;border-radius:50%;background:#fff;object-fit:contain;flex:none");
		logo.src = "/assets/dagaarsoft_license/images/logo.png"; logo.alt = "Dagaar Technology";
		head.appendChild(logo);
		head.appendChild(el("div", "width:1px;align-self:stretch;background:rgba(255,255,255,.35);flex:none"));
		var tt = el("div", "");
		tt.appendChild(el("div", "font-weight:700;font-size:clamp(18px,3.2vw,26px);line-height:1.25", "Cusboonaysiinta Adeegga ayaa Loo Baahan Yahay"));
		tt.appendChild(el("div", "font-size:14px;opacity:.85;margin-top:4px", "DagaarSoft License · " + (closed ? "La hakiyay / Suspended" : "Akhris-keliya / Read only")));
		head.appendChild(tt);
		var body = el("div", "padding:24px 28px 8px;text-align:center");
		body.appendChild(el("p", "margin:0 0 16px;font-size:clamp(15px,2.2vw,18px);line-height:1.6", so));
		body.appendChild(el("div", "height:1px;background:#dfe5ee;margin:0 0 16px"));
		body.appendChild(el("p", "margin:0 0 20px;font-size:clamp(14px,2vw,17px);line-height:1.6;color:#2c3e5c", en));
		if (d.amount) {
			var bal = el("div", "display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 16px;background:#E3EEFB;border-radius:12px;padding:14px 18px;margin:0 0 20px");
			bal.appendChild(el("span", "font-weight:700;font-size:clamp(14px,2vw,17px)", "Lacagta kugu maqan / Outstanding Balance:"));
			bal.appendChild(el("span", "font-weight:800;font-size:clamp(20px,3.4vw,28px);color:#F28C0F", (d.currency || "") + " " + Number(d.amount).toFixed(2)));
			body.appendChild(bal);
		}
		var row = el("div", "display:flex;gap:14px;flex-wrap:wrap;padding:0 28px 18px");
		function btn(css, icon, label, fn) { var b = el("button", css); b.type = "button"; b.innerHTML = icon; b.appendChild(document.createTextNode(label)); b.onclick = fn; row.appendChild(b); }
		var base = "flex:1 1 220px;display:flex;align-items:center;justify-content:center;gap:10px;border-radius:12px;font-weight:700;font-size:17px;cursor:pointer;";
		if (d.pay_url) btn(base + "background:#F7941D;color:#fff;border:0;padding:15px 18px", ICON_PAY, "Bixi Lacagta", function () { window.open(d.pay_url, "dagaar_pay", "width=480,height=760"); });
		if (d.help_url) btn(base + "background:#fff;color:#14284B;border:2px solid #14284B;padding:13px 18px", ICON_HELP, "La xidhiidh Dagaar", function () { window.open(d.help_url, "_blank"); });
		var foot = el("div", "display:flex;align-items:center;gap:14px;padding:0 28px 14px;color:#2d5ea8;font-size:14px");
		foot.appendChild(el("div", "flex:1;height:1px;background:#dfe5ee")); foot.appendChild(el("span", "", "Dagaar Technology")); foot.appendChild(el("div", "flex:1;height:1px;background:#dfe5ee"));
		var go = el("div", "text-align:center;padding:0 28px 18px");
		var link = el("button", "background:none;border:0;color:#5b6b80;text-decoration:underline;cursor:pointer;font-size:14px", closed ? "Maamulaha / Administrator" : "Sii wad gelitaanka / Continue to sign in");
		link.type = "button"; link.onclick = function () { veil.remove(); }; go.appendChild(link);
		card.appendChild(head); card.appendChild(body); card.appendChild(row); card.appendChild(foot); card.appendChild(go);
		veil.appendChild(card);
		(document.body || document.documentElement).appendChild(veil);
	}
	fetch("/api/method/dagaarsoft_license.api.sign_in_notice", { headers: { Accept: "application/json" } })
		.then(function (r) { return r.json(); }).then(function (j) {
			var d = j.message || {};
			if (d.state !== "Suspended" && d.state !== "Read Only") return;
			if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { show(d); }); else show(d);
		}).catch(function () {});
})();
