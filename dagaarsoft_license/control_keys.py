"""One key per site for the Dagaar control server.

    bench --site <site> execute dagaarsoft_license.control_keys.make

Creates (once) the user dagaar.control@dagaarsoft.app (System Manager, no password, cannot sign in
on screen) with an API key, and prints "site_url,api_key,api_secret". Running it again prints the same
key. tools/export_keys.sh runs it for every site of the bench.
"""

import frappe

USER = "dagaar.control@dagaarsoft.app"


def make():
	if not frappe.db.exists("User", USER):
		user = frappe.get_doc({"doctype": "User", "email": USER, "first_name": "Dagaar Control", "user_type": "System User",
		                       "send_welcome_email": 0, "enabled": 1, "roles": [{"role": "System Manager"}]})
		user.flags.ignore_permissions = True
		user.flags.no_welcome_mail = True
		user.insert()
	user = frappe.get_doc("User", USER)
	if not user.enabled:
		user.enabled = 1
	if "System Manager" not in [r.role for r in user.roles]:
		user.append("roles", {"role": "System Manager"})
	secret = None
	if user.api_key:
		try:
			secret = user.get_password("api_secret")
		except Exception:
			secret = None
	if not user.api_key or not secret:
		user.api_key = user.api_key or frappe.generate_hash(length=15)
		secret = frappe.generate_hash(length=15)
		user.api_secret = secret
	user.flags.ignore_permissions = True
	user.save()
	frappe.db.commit()
	line = f"{frappe.utils.get_url()},{user.api_key},{secret}"
	print("DAGAAR_KEY " + line)
	return line
