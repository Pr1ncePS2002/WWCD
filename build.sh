# build.sh
#!/usr/bin/env bash
# exit on error
set -o errexit

# Update pip
pip install --upgrade pip

# Install setuptools and wheel first
pip install setuptools wheel

# Install the rest of the project dependencies
pip install -r requirements.txt
