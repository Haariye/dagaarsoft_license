"""DagaarSoft License: what this site may do, as set by the Dagaar control server.

States
  Free       installed default: no restrictions, no reminders
  Active     paid: no restrictions
  Reminder   an invoice is due: the license box pops up (first open, then every hour)
  Grace      past due: same, with the closing date
  Read Only  everyone (Administrator included) can open and view everything but change nothing
             (until read_only_until; then the site is treated as Suspended)
  Suspended  everyone is signed out and cannot sign in (Administrator included); all users except
           Administrator and the control server's API user are switched off, and switched back on
           when the state changes again
"""

import frappe
from frappe import _
from frappe.utils import getdate, nowdate

DOCTYPE = "DagaarSoft License"
STATES = ("Free", "Active", "Reminder", "Grace", "Read Only", "Suspended")
# Records the system itself writes while people only read (sign-in, views, logs, settings of the user).
ALWAYS_ALLOWED = {
	DOCTYPE, "Version", "Activity Log", "Access Log", "Error Log", "Route History", "User Settings",
	"Session Default Settings", "Notification Log", "Scheduled Job Log", "Email Queue", "Email Queue Recipient",
	"Prepared Report", "Deleted Document", "Console Log", "Comment Like", "Document Follow", "View Log",
	"Unhandled Email", "Communication", "Dashboard Settings", "List View Settings", "Kanban Board",
	"Desktop Icon", "Workspace", "User Permission", "Sessions", "Energy Point Log", "Success Action",
	"Integration Request", "RQ Job",
}
READ_ONLY_MSG = ("Nidaamku hadda wuxuu ku jiraa xaalad akhris-keliya ah (read-only) sababtoo ah lacag-bixinta "
                 "rukunka ayaa dib u dhacday. Wax waad arki kartaa, laakiin wax lama beddeli karo. "
                 "/ The system is read-only until the subscription is paid: you can view but not change anything.")
CLOSED_MSG = ("Adeegga waa la hakiyay sababtoo ah lacag-bixinta rukunka ayaa dib u dhacday. Fadlan la xidhiidh "
              "Dagaar Technology. / The service is suspended until the subscription is paid. Please contact "
              "Dagaar Technology.")


def get():
	"""The license values, cached per request."""
	cache = getattr(frappe.local, "dagaarsoft_license", None)
	if cache is None:
		try:
			cache = frappe.get_cached_doc(DOCTYPE).as_dict()
		except Exception:
			cache = frappe._dict(state="Free")
		frappe.local.dagaarsoft_license = cache
	return cache


def effective_state(lic=None):
	lic = lic or get()
	state = lic.get("state") or "Free"
	if state == "Read Only" and lic.get("read_only_until") and getdate(lic.read_only_until) < getdate(nowdate()):
		return "Suspended"
	return state if state in STATES else "Free"


def guard_write(doc, method=None):
	"""Read Only: no changes by people (scheduled and system jobs are not blocked)."""
	if doc.doctype in ALWAYS_ALLOWED or frappe.flags.in_install or frappe.flags.in_migrate or frappe.flags.dagaarsoft_license_cleanup:
		return
	if not getattr(frappe.local, "request", None):
		return
	if effective_state() in ("Read Only", "Suspended"):
		frappe.throw(_(READ_ONLY_MSG), frappe.PermissionError, title=_("DagaarSoft License"))


def on_session_creation(login_manager=None):
	"""Suspended: nobody signs in, Administrator included."""
	if effective_state() == "Suspended":
		if hasattr(frappe.local, "login_manager"):
			frappe.local.login_manager.logout()
		frappe.throw(_(CLOSED_MSG), frappe.AuthenticationError, title=_("DagaarSoft License"))


def before_request():
	"""Suspended: everyone already signed in is signed out (Administrator included). The Dagaar
	control server's API-key calls have no session, so they still work."""
	user = getattr(frappe.session, "user", "Guest")
	if user == "Guest" or effective_state() != "Suspended":
		return
	path = frappe.request.path if getattr(frappe, "request", None) else ""
	if path in ("/api/method/logout", "/login") or path.startswith("/assets/"):
		return
	frappe.local.login_manager.logout()
	frappe.db.commit()
	if path.startswith("/api/"):
		frappe.throw(_(CLOSED_MSG), frappe.AuthenticationError)
	from werkzeug.routing import RequestRedirect

	raise RequestRedirect("/login")


def public(lic=None):
	"""What the license box shows (no secrets)."""
	lic = lic or get()
	return {
		"state": effective_state(lic),
		"plan": lic.get("plan") or ("Free License" if (lic.get("state") or "Free") == "Free" else None),
		"plan_features": [x.strip(" -•\t") for x in (lic.get("plan_features") or "").splitlines() if x.strip(" -•\t")],
		"customer_name": lic.get("customer_name"),
		"message_so": lic.get("message_so"),
		"message_en": lic.get("message_en"),
		"amount": lic.get("amount"),
		"currency": lic.get("currency"),
		"due_date": str(lic.get("due_date") or "") or None,
		"read_only_until": str(lic.get("read_only_until") or "") or None,
		"pay_url": lic.get("pay_url"),
		"help_url": lic.get("help_url"),
		"methods": [m.strip() for m in (lic.get("payment_methods") or "ZAAD, EVC Plus, Sahal, eDahab").split(",")
		            if m.strip()],
		"contact": lic.get("contact") or "Dagaar Technology",
		"version": frappe.get_attr("dagaarsoft_license.__version__"),
	}


def boot_session(bootinfo):
	if frappe.session.user != "Guest":
		bootinfo.dagaarsoft_license = public()


def after_install():
	"""Free License by default, and "DagaarSoft License" in the user menu."""
	if not frappe.db.exists("DocType", DOCTYPE):
		frappe.reload_doc("dagaarsoft_license", "doctype", "dagaarsoft_license")
	if not frappe.db.get_single_value(DOCTYPE, "state"):
		frappe.db.set_single_value(DOCTYPE, "state", "Free")
	nav = frappe.get_single("Navbar Settings")
	if not any(i.item_label == "DagaarSoft License" for i in nav.settings_dropdown):
		rows = list(nav.settings_dropdown)
		logout_at = next((k for k, r in enumerate(rows) if (r.action or "").startswith("frappe.app.logout")), len(rows))
		nav.settings_dropdown = []
		for k, r in enumerate(rows):
			if k == logout_at:
				nav.append("settings_dropdown", {"item_label": "DagaarSoft License", "item_type": "Action",
				                                 "action": "dagaarsoft_license.show()", "is_standard": 0})
			nav.append("settings_dropdown", r.as_dict())
		if logout_at == len(rows):
			nav.append("settings_dropdown", {"item_label": "DagaarSoft License", "item_type": "Action",
			                                 "action": "dagaarsoft_license.show()", "is_standard": 0})
		nav.flags.ignore_permissions = True
		nav.save()
	frappe.db.commit()


def switch_users(state, caller):
	"""Suspended: switch off every user except Administrator, Guest and the caller (the control
	server's API user, whose key must keep working). Any other state: switch them back on."""
	import json

	import frappe.sessions

	doc = frappe.get_single(DOCTYPE)
	saved = json.loads(doc.disabled_users or "[]")
	frappe.flags.dagaarsoft_license_cleanup = True
	try:
		if state == "Suspended":
			keep = {"Administrator", "Guest", caller}
			users = frappe.get_all("User", filters={"enabled": 1, "name": ("not in", list(keep))}, pluck="name")
			if users:
				saved = sorted(set(saved) | set(users))
				frappe.db.set_single_value(DOCTYPE, "disabled_users", json.dumps(saved))
				frappe.db.commit()  # saved first: a failure half way never loses who must come back
				for user in users:
					frappe.db.set_value("User", user, "enabled", 0)
					frappe.sessions.clear_sessions(user=user, force=True)
		elif saved:
			for user in saved:
				if frappe.db.exists("User", user):
					frappe.db.set_value("User", user, "enabled", 1)
			frappe.db.set_single_value(DOCTYPE, "disabled_users", None)
		frappe.cache.delete_key("enabled_users")
	finally:
		frappe.flags.dagaarsoft_license_cleanup = False
