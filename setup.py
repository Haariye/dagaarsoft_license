# For older benches (Frappe v13) that install apps with setup.py.
import re

from setuptools import find_packages, setup

with open("dagaarsoft_license/__init__.py") as f:
	version = re.search(r'__version__ = "([^"]+)"', f.read()).group(1)

setup(
	name="dagaarsoft_license",
	version=version,
	description="DagaarSoft License",
	author="Dagaar Technology",
	author_email="info@dagaar.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=[],
)
