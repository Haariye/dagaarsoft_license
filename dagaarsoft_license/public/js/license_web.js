/* DagaarSoft License on the sign-in page: shown only when the site is closed or read-only. */
(function () {
	var p = location.pathname.replace(/\/$/, "");
	if (p !== "/login" && p !== "") return;
	function el(t, css, txt) { var e = document.createElement(t); if (css) e.style.cssText = css; if (txt) e.textContent = txt; return e; }
	fetch("/api/method/dagaarsoft_license.api.sign_in_notice", { headers: { Accept: "application/json" } })
		.then(function (r) { return r.json(); }).then(function (j) {
			var d = j.message || {};
			if (d.state !== "Suspended" && d.state !== "Read Only") return;
			var closed = d.state === "Suspended";
			var veil = el("div", "position:fixed;inset:0;background:rgba(9,20,35,.62);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif;overflow:auto");
			var card = el("div", "width:700px;max-width:90vw;background:#fff;color:#14284B;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;margin:auto");
			var head = el("div", "background:#0E2A5C;color:#fff;padding:20px 28px;font-weight:700;font-size:22px", "DagaarSoft License");
			var body = el("div", "padding:22px 28px;text-align:center;line-height:1.6");
			body.appendChild(el("p", "margin:0 0 12px;font-size:17px", d.message_so || (closed ? "Adeegga waa la hakiyay ilaa lacagta la bixiyo." : "Nidaamku waa akhris-keliya ilaa lacagta la bixiyo.")));
			body.appendChild(el("p", "margin:0 0 16px;color:#2c3e5c", d.message_en || (closed ? "The service is suspended until payment is made." : "The system is read-only until payment is made.")));
			if (d.amount) body.appendChild(el("div", "background:#E3EEFB;border-radius:12px;padding:12px;font-weight:700", "Lacagta kugu maqan / Outstanding Balance: " + (d.currency || "") + " " + Number(d.amount).toFixed(2)));
			var row = el("div", "display:flex;gap:12px;flex-wrap:wrap;padding:0 28px 22px");
			if (d.pay_url) { var pay = el("button", "flex:1 1 200px;background:#F7941D;color:#fff;border:0;border-radius:12px;padding:14px;font-weight:700;font-size:16px;cursor:pointer", "Bixi Lacagta"); pay.onclick = function () { window.open(d.pay_url, "dagaar_pay", "width=480,height=760"); }; row.appendChild(pay); }
			if (d.help_url) { var help = el("button", "flex:1 1 200px;background:#fff;color:#14284B;border:2px solid #14284B;border-radius:12px;padding:12px;font-weight:700;font-size:16px;cursor:pointer", "La xidhiidh Dagaar"); help.onclick = function () { window.open(d.help_url, "_blank"); }; row.appendChild(help); }
			var cont = el("button", "flex:1 1 140px;background:transparent;border:1px solid #c9d3e0;border-radius:12px;padding:12px;color:#14284B;cursor:pointer", closed ? "Maamulaha (Administrator)" : "Sii wad / Continue");
			cont.onclick = function () { veil.remove(); }; row.appendChild(cont);
			card.appendChild(head); card.appendChild(body); card.appendChild(row); veil.appendChild(card);
			(document.body || document.documentElement).appendChild(veil);
		}).catch(function () {});
})();
