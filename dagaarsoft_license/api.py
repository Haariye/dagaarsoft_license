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
