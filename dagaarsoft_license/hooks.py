app_name = "dagaarsoft_license"
app_title = "DagaarSoft License"
app_publisher = "Dagaar Technology"
app_description = "DagaarSoft License: subscription status, reminders, read-only and suspension"
app_email = "info@dagaar.com"
app_license = "MIT"

after_install = "dagaarsoft_license.license.after_install"
after_migrate = "dagaarsoft_license.license.after_install"

from dagaarsoft_license import __version__ as _v

# ?v=<version>: browsers keep /assets files for a year, so a new version must have a new URL
app_include_js = [f"/assets/dagaarsoft_license/js/whitelabel.js?v={_v}", f"/assets/dagaarsoft_license/js/license.js?v={_v}"]
web_include_js = [f"/assets/dagaarsoft_license/js/license_web.js?v={_v}"]

boot_session = "dagaarsoft_license.license.boot_session"
on_session_creation = "dagaarsoft_license.license.on_session_creation"
before_request = ["dagaarsoft_license.license.before_request"]

# White-label: DagaarSoft names instead of ERPNext / Frappe (see whitelabel.py; no migrate needed)
after_request = ["dagaarsoft_license.whitelabel.after_request"]
update_website_context = ["dagaarsoft_license.whitelabel.update_website_context"]
override_whitelisted_methods = {"frappe.utils.change_log.get_versions": "dagaarsoft_license.whitelabel.get_versions"}

doc_events = {
	"*": {
		"before_insert": "dagaarsoft_license.license.guard_write",
		"validate": "dagaarsoft_license.license.guard_write",
		"on_trash": "dagaarsoft_license.license.guard_write",
		"before_submit": "dagaarsoft_license.license.guard_write",
		"before_cancel": "dagaarsoft_license.license.guard_write",
	},
	"Email Queue": {"before_insert": "dagaarsoft_license.whitelabel.email_queue"},
}
