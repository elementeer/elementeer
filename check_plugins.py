import sys
import json
import subprocess
import base64

# Use curl to get plugins
result = subprocess.run(['curl', '-s', '-u', 'typelicious:fnCA lwhZ 7eB7 KYuT vaQ4 eBpK', 'https://marcus-urban.de/wp-json/wp/v2/plugins'], capture_output=True, text=True)
if result.returncode != 0:
    print("Failed to fetch plugins")
    sys.exit(1)

data = json.loads(result.stdout)
for plugin in data:
    print(f"Plugin: {plugin.get('plugin')}, Version: {plugin.get('version')}, Status: {plugin.get('status')}")