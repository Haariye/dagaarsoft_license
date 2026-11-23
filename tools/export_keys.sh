#!/bin/bash
# Print the Dagaar control key of every site on this bench into dagaar_keys.csv (site_url,api_key,api_secret).
# Run from the bench folder:  bash apps/dagaarsoft_license/tools/export_keys.sh
# Then send dagaar_keys.csv to Dagaar and delete it.
set -u
cd "$(dirname "$0")/../../.." || exit 1
out=dagaar_keys.csv
: > "$out"; chmod 600 "$out"
for dir in sites/*/; do
  site=$(basename "$dir")
  [ -f "sites/$site/site_config.json" ] || continue
  bench --site "$site" execute frappe.get_installed_apps 2>/dev/null | grep -q '"dagaarsoft_license"' || { echo "- $site: license app not installed, skipped"; continue; }
  line=$(bench --site "$site" execute dagaarsoft_license.control_keys.make 2>/dev/null | grep '^DAGAAR_KEY ' | sed 's/^DAGAAR_KEY //')
  if [ -n "$line" ]; then echo "$line" >> "$out"; echo "+ $site"; else echo "! $site: failed"; fi
done
echo "Done: $(wc -l < "$out") sites in $PWD/$out"
