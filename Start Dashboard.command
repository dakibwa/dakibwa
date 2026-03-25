#!/bin/bash
# Launch the repo-local running dashboard.

cd "$(dirname "$0")/local-dashboard"
python3 launch.py
