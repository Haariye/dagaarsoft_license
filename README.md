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
