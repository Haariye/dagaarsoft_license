import frappe
from frappe import _

from dagaarsoft_license import license as lic

FIELDS = ("state", "plan", "customer_name", "message_so", "message_en", "amount", "currency", "due_date",
          "read_only_until", "pay_url", "help_url", "payment_methods", "contact")


@frappe.whitelist()
def status():
	return lic.public()


@frappe.whitelist(methods=["POST"])
def update(**values):
	"""Called by the Dagaar control server with this site's System Manager API key."""
	if "System Manager" not in frappe.get_roles():
		frappe.throw(_("Not permitted."), frappe.PermissionError)
	state = values.get("state")
	if state and state not in lic.STATES:
		frappe.throw(_("Unknown state."))
	doc = frappe.get_single(lic.DOCTYPE)
	for key in FIELDS:
		if key in values:
			doc.set(key, values[key] or None)
	doc.last_update = frappe.utils.now_datetime()
	doc.flags.ignore_permissions = True
	doc.save()
	frappe.clear_document_cache(lic.DOCTYPE, lic.DOCTYPE)
	return lic.public()


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
		if "<!-- dagaar-service -->" in (nav.announcement_widget or ""):
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
