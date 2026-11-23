"""DagaarSoft names everywhere a user can see the product name (white-label).

ERPNext -> DagaarSoft, Frappe HR / HRMS -> DagaarSoft HR, Healthcare (app) -> DagaarSoft Healthcare,
Frappe Framework / Frappe -> DagaarSoft. Nothing in frappe/erpnext is edited and no migrate is needed:
  - desk: boot (translations), public/js/whitelabel.js (help menu, texts, logo, About box)
  - web pages (sign-in, /apps, /app shell, footer): update_website_context + after_request
  - e-mails: the "Sent via ERPNext" footer line (Email Queue before_insert)

Switch: site_config "dagaarsoft_whitelabel": 0 turns it off (1 on). Without that key the value the
Dagaar control server sent (api.update whitelabel=0/1) is used; default ON.
"""

import re

import frappe

LOGO = "/assets/dagaarsoft_license/images/logo.png"
SUPPORT_URL = "https://dagaar.net/support"
WEBSITE_URL = "https://dagaar.net"

# Order matters: the longer names first.
RULES = [
	(re.compile(r"\bFrappe Technologies(?: Pvt\.? Ltd\.?)?"), "Dagaar Technology"),
	(re.compile(r"\bFrappe Framework\b"), "DagaarSoft"),
	(re.compile(r"\bFrappe HR\b"), "DagaarSoft HR"),
	(re.compile(r"\bHRMS\b"), "DagaarSoft HR"),
	(re.compile(r"\bERPNext\b"), "DagaarSoft"),
	(re.compile(r"\bFrappe\b"), "DagaarSoft"),
	(re.compile(r"\bDagaarSoft DagaarSoft\b"), "DagaarSoft"),
]
QUICK = re.compile(r"ERPNext|Frappe|HRMS")
APP_TITLES = {
	"frappe": "DagaarSoft Framework", "erpnext": "DagaarSoft ERP", "hrms": "DagaarSoft HR",
	"healthcare": "DagaarSoft Healthcare", "dagaarsoft_license": "DagaarSoft License",
}
# Default product logos of frappe / erpnext / hrms / healthcare (custom logos are left alone).
DEFAULT_LOGO = re.compile(r"/assets/(?:frappe|erpnext|hrms|healthcare)/images/[\w./-]*(?:logo|favicon)[\w./-]*")


def enabled():
	try:
		value = frappe.conf.get("dagaarsoft_whitelabel")
		if value is None:
			value = frappe.db.get_default("dagaarsoft_whitelabel")
		return value in (None, "") or str(value).strip().lower() not in ("0", "false", "off", "no")
	except Exception:
		return True


def rebrand(text):
	if not text or not isinstance(text, str) or not QUICK.search(text):
		return text
	for rx, new in RULES:
		text = rx.sub(new, text)
	return text


# ---------------------------------------------------------------- desk (boot)


def boot_session(bootinfo):
	if frappe.session.user == "Guest":
		return
	on = enabled()
	bootinfo.dagaarsoft_whitelabel = {"on": 1 if on else 0, "logo": LOGO, "support": SUPPORT_URL,
	                                  "website": WEBSITE_URL, "titles": APP_TITLES}
	if not on:
		return
	# Translations already loaded for the user's language (non-English ones may hold "ERPNext").
	messages = bootinfo.get("__messages")
	if isinstance(messages, dict):
		for key, value in list(messages.items()):
			if isinstance(value, str) and QUICK.search(value):
				messages[key] = rebrand(value)


@frappe.whitelist()
def get_versions():
	"""About box: app names as DagaarSoft names (replaces frappe.utils.change_log.get_versions)."""
	from frappe.utils.change_log import get_versions as original

	versions = original()
	if enabled():
		for app, info in versions.items():
			info["title"] = APP_TITLES.get(app) or rebrand(info.get("title"))
			if info.get("description"):
				info["description"] = rebrand(info["description"])
	return versions


# ---------------------------------------------------------------- web pages


def update_website_context(context):
	if not enabled():
		return
	if (context.get("app_name") or "Frappe") in ("Frappe", "ERPNext", "Frappe Framework"):
		context["app_name"] = "DagaarSoft"
	for key in ("favicon", "splash_image"):
		value = context.get(key)
		if not value or DEFAULT_LOGO.fullmatch(str(value)):
			context[key] = LOGO
	if not context.get("footer_powered") or QUICK.search(str(context.get("footer_powered"))):
		context["footer_powered"] = 'Powered by <a href="{0}" target="_blank" class="text-muted">DagaarSoft</a>'.format(
			WEBSITE_URL)


# Text that is shown: everything outside tags, scripts, styles, editors and comments.
_SKIP = re.compile(r"(<script\b.*?</script\s*>|<style\b.*?</style\s*>|<textarea\b.*?</textarea\s*>|<pre\b.*?</pre\s*>"
                   r"|<code\b.*?</code\s*>|<!--.*?-->|<[^>]*>)", re.S | re.I)
_ATTR = re.compile(r"""(\s(?:alt|title|placeholder|aria-label)=)("[^"]*"|'[^']*')""", re.I)
_NO_REWRITE = ("/api/", "/assets/", "/files/", "/private/", "/printview", "/backups")


def after_request(response=None, request=None):
	"""Web pages (sign-in, /apps, the /app shell, website footer): DagaarSoft names in the HTML."""
	try:
		if response is None or getattr(response, "direct_passthrough", False) or response.status_code != 200:
			return
		if (response.mimetype or "") != "text/html":
			return
		if request is None:
			request = getattr(frappe.local, "request", None)
		path = getattr(request, "path", None) or ""
		if path.startswith(_NO_REWRITE) or not enabled():
			return
		html = response.get_data(as_text=True)
		if not html or len(html) > 3_000_000:
			return
		new = DEFAULT_LOGO.sub(LOGO, html)
		new = new.replace("<!-- Built on Frappe. https://frappeframework.com/ -->", "")
		if QUICK.search(new):
			new = rewrite_html(new)
		if new != html:
			response.set_data(new)
	except Exception:
		frappe.logger().error("DagaarSoft white-label: after_request", exc_info=True)


def rewrite_html(html):
	parts = _SKIP.split(html)
	for i, part in enumerate(parts):
		if not part or not QUICK.search(part):
			continue
		if i % 2 == 0:
			parts[i] = rebrand(part)
		elif part.startswith("<") and not part.startswith(("<script", "<style", "<!--", "<SCRIPT", "<STYLE")):
			# a tag (or a pre/code/textarea block): only the visible attributes of its first tag
			end = part.find(">") + 1
			parts[i] = _ATTR.sub(lambda m: m.group(1) + rebrand(m.group(2)), part[:end]) + part[end:]
	return "".join(parts)


# ---------------------------------------------------------------- e-mails


def _qp(text):
	"""Regex for text inside a quoted-printable or plain mail: soft line breaks anywhere, "=" as =3D."""
	pieces = ["=(?:3D)?" if c == "=" else re.escape(c) for c in text]
	return "(?:=\r?\n)?".join(pieces)


_MAIL_LINK = re.compile(_qp("https://frappe.io/erpnext?source=via_email_footer"))
_MAIL_NAME = re.compile(r"(Sent via(?:.|\n){0,400}?>\s*)ERPNext(\s*<)")


def email_queue(doc, method=None):
	"""The standard "Sent via ERPNext" e-mail footer line: "Sent via DagaarSoft"."""
	try:
		message = doc.get("message") or ""
		if "Sent via" not in message or not enabled():
			return
		new = _MAIL_LINK.sub(WEBSITE_URL, message)
		new = _MAIL_NAME.sub(lambda m: m.group(1) + "DagaarSoft" + m.group(2), new)
		if new != message:
			doc.message = new
	except Exception:
		frappe.logger().error("DagaarSoft white-label: email", exc_info=True)
