#!/bin/bash
# Install DagaarSoft License on every site of this bench (each site is backed up first).
# Run from the bench folder after `bench get-app <repo url>`:
#     bash apps/dagaarsoft_license/tools/install_all_sites.sh
# Then restart once: sudo supervisorctl restart all   (or: bench restart)
set -u
cd "$(dirname "$0")/../../.." || exit 1
[ -d apps/dagaarsoft_license ] || { echo "apps/dagaarsoft_license not found: run bench get-app first"; exit 1; }
for dir in sites/*/; do
  site=$(basename "$dir")
  [ -f "sites/$site/site_config.json" ] || continue
  if bench --site "$site" list-apps 2>/dev/null | grep -q '^dagaarsoft_license'; then
    echo "= $site: already installed (running migrate)"; bench --site "$site" migrate >/dev/null 2>&1 || echo "! $site: migrate failed"
    continue
  fi
  echo "+ $site: backup and install"
  bench --site "$site" backup >/dev/null 2>&1 || { echo "! $site: backup failed, skipped"; continue; }
  bench --site "$site" install-app dagaarsoft_license || echo "! $site: install failed"
done
bench build --app dagaarsoft_license
echo "Done. Restart the bench once now: sudo supervisorctl restart all"
