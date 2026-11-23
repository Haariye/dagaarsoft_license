import frappe
from frappe import _

from dagaarsoft_license import license as lic

FIELDS = ("state", "plan", "plan_features", "customer_name", "message_so", "message_en", "amount", "currency", "due_date",
          "read_only_until", "pay_url", "help_url", "payment_methods", "contact")


@frappe.whitelist()
def status():
	return lic.public_for_user()


@frappe.whitelist(methods=["POST"])
def update(**values):
	"""Called by the Dagaar control server with this site's System Manager API key."""
	if "System Manager" not in frappe.get_roles():
		frappe.throw(_("Not permitted."), frappe.PermissionError)
	state = values.get("state")
	if state and state not in lic.STATES:
		frappe.throw(_("Unknown state."))
	doc = frappe.get_single(lic.DOCTYPE)
	_save_extras(values, doc.state)
	for key in FIELDS:
		if key in values:
			doc.set(key, values[key] or None)
	doc.last_update = frappe.utils.now_datetime()
	doc.flags.ignore_permissions = True
	doc.save()
	frappe.clear_document_cache(lic.DOCTYPE, lic.DOCTYPE)
	frappe.local.dagaarsoft_license = None
	lic.switch_users(lic.effective_state(doc.as_dict()), frappe.session.user)
	frappe.clear_document_cache(lic.DOCTYPE, lic.DOCTYPE)
	frappe.local.dagaarsoft_license = None
	return lic.public()


def _save_extras(values, old_state):
	"""Kept as site defaults (no new DocType fields, so no migrate is needed):
	audience  {"<state>": [{"step", "roles", "after_days", "mode"}]}: who sees the messages
	state_since  "YYYY-MM-DD": the day the current state began (today when the state changes without it)
	whitelabel  0/1: DagaarSoft names instead of ERPNext / Frappe (site_config dagaarsoft_whitelabel wins)"""
	import json

	if "audience" in values:
		aud = values.get("audience") or {}
		if isinstance(aud, str):
			aud = json.loads(aud or "{}")
		if not isinstance(aud, dict):
			frappe.throw(_("audience must be an object."))
		frappe.db.set_default(lic.AUDIENCE_KEY, json.dumps(aud))
	if values.get("state_since"):
		frappe.db.set_default(lic.STATE_SINCE_KEY, str(frappe.utils.getdate(str(values["state_since"])[:10])))
	elif values.get("state") and values.get("state") != old_state:
		frappe.db.set_default(lic.STATE_SINCE_KEY, frappe.utils.nowdate())
	if "whitelabel" in values:
		value = "1" if frappe.utils.cint(values.get("whitelabel")) else "0"
		if frappe.db.get_default("dagaarsoft_whitelabel") != value:
			frappe.db.set_default("dagaarsoft_whitelabel", value)
			frappe.clear_cache()


@frappe.whitelist(allow_guest=True)
def sign_in_notice():
	"""For the sign-in page: only when the site is closed or read-only."""
	data = lic.public()
	if data["state"] not in ("Suspended", "Read Only"):
		return {"state": data["state"]}
	return {k: data[k] for k in ("state", "message_so", "message_en", "amount", "currency", "pay_url", "help_url",
	                             "methods", "contact")}


@frappe.whitelist(methods=["POST"])
def cleanup_legacy(users=None, announcement=None):
	"""Called by the Dagaar control server: remove the older notice (sign-in script and banner) and switch
	back on the users it had switched off. Works in any state, read-only included."""
	import json

	if "System Manager" not in frappe.get_roles():
		frappe.throw(_("Not permitted."), frappe.PermissionError)
	frappe.flags.dagaarsoft_license_cleanup = True
	try:
		ws = frappe.get_single("Website Script")
		js = ws.javascript or ""
		start, end = "/* dagaar-service:start */", "/* dagaar-service:end */"
		while start in js and end in js:
			a = js.index(start)
			b = js.index(end, a) + len(end)
			js = (js[:a].rstrip("\n") + "\n" + js[b:].lstrip("\n")).strip("\n")
		if js != (ws.javascript or ""):
			ws.javascript = js
			ws.flags.ignore_permissions = True
			ws.save()
		nav = frappe.get_single("Navbar Settings")
		# older Frappe versions have no announcement field: nothing to clean there
		if nav.meta.has_field("announcement_widget") and "<!-- dagaar-service -->" in (nav.get("announcement_widget") or ""):
			nav.announcement_widget = announcement or ""
			nav.flags.ignore_permissions = True
			nav.save()
		names = json.loads(users) if isinstance(users, str) else (users or [])
		enabled = []
		for user in names:
			if user not in ("Administrator", "Guest") and frappe.db.exists("User", user):
				frappe.db.set_value("User", user, "enabled", 1)
				enabled.append(user)
		return {"ok": True, "users_enabled": enabled}
	finally:
		frappe.flags.dagaarsoft_license_cleanup = False


@frappe.whitelist()
def popup_check(signed_in=0):
	"""Should the license box pop up now for this user? Counted on the server (per user, per day), so
	clearing the browser cache does not bring it back. At most twice a day, 4 hours apart; the first
	one right after signing in."""
	from frappe.utils import cint, nowdate

	data = lic.public()
	due = data["state"] in ("Reminder", "Grace", "Read Only", "Suspended") or (
		data["state"] == "Active" and float(data.get("amount") or 0) > 0)
	if not due or not lic.can_see():
		return {"show": False}
	import time

	key = f"dagaarsoft_license:popups:{frappe.session.user}:{nowdate()}"
	cache = lic._cache()
	seen = cache.get_value(key) or {"count": 0, "last": 0}
	gap_ok = (time.time() - seen["last"]) >= 4 * 3600
	if seen["count"] >= 2 or not (cint(signed_in) or gap_ok) or (seen["count"] and not gap_ok):
		return {"show": False}
	seen = {"count": seen["count"] + 1, "last": time.time()}
	cache.set_value(key, seen, expires_in_sec=2 * 24 * 3600)
	data["audience"] = True
	return {"show": True, "license": data}
