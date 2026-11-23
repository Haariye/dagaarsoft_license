# DagaarSoft License

Small app for DagaarSoft client sites. Installed as a **Free License** (no restrictions).
The Dagaar control server sets the state through `dagaarsoft_license.api.update` (System Manager API key):
Free, Active, Reminder, Grace, Read Only, Suspended. User menu → "DagaarSoft License" shows the license box.

## Install on all sites of a server
```
cd ~/frappe-bench
bench get-app <this repo url>
bash apps/dagaarsoft_license/tools/install_all_sites.sh
sudo supervisorctl restart all
```
Every site starts as **Free License**. Then add each site under Client Sites on the Dagaar server
(site address + System Manager API key/secret); from then on Dagaar sets its state.

## States
Free / Active: no limits. Reminder, Grace: the license box pops up on first open and every hour.
Read Only: people can view but not change anything (until the read-only date), box every hour.
Suspended: only Administrator can sign in; the sign-in page shows the notice and payment buttons.

## Who sees the messages (audience)
The control server can send `audience` (per state: steps of roles, `after_days`, Add/Replace) and
`state_since` with `api.update`. Pop-ups and the payment message in the license box then show only to
users with one of the active roles (System Manager and Administrator always). No steps = everyone;
Suspended = everyone. Read-only and suspension themselves still apply to all users.

## DagaarSoft names (white-label)
On by default: ERPNext → DagaarSoft, Frappe HR → DagaarSoft HR, Healthcare → DagaarSoft Healthcare,
Frappe → DagaarSoft (browser title, logo, sign-in page, /apps, About box, help menu → Dagaar support,
website footer, "Sent via" e-mail line, translated texts). Nothing in frappe/erpnext is changed.
Turn off on one site: `bench --site <site> set-config -p dagaarsoft_whitelabel 0` (or the control server
sends `whitelabel=0` with `api.update`), then `bench --site <site> clear-cache`.

## Update a server (no migrate needed)
```
cd ~/frappe-bench/apps/dagaarsoft_license && git pull upstream main   # or: git pull
cd ~/frappe-bench && bench build --app dagaarsoft_license
for s in $(ls sites/*/site_config.json | cut -d/ -f2); do bench --site $s clear-cache; done
sudo supervisorctl restart all   # or: bench restart
```
