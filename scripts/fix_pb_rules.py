#!/usr/bin/env python3
import urllib.request, urllib.error, json, sys

BASE = "http://127.0.0.1:8090"

def req(method, path, data=None, token=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

# Auth as superuser
print("Authenticating as superuser...")
res = req("POST", "/api/collections/_superusers/auth-with-password",
          {"identity": "deploy@aitherwarth.internal", "password": "AitherWarthAdmin2025Secure"})
print("Auth response:", json.dumps(res)[:200])

token = res.get("token")
if not token:
    print("Auth failed. Trying to open rules without token via direct DB patch...")
    sys.exit(1)

print("Got token, opening applied_capes collection rules...")
res2 = req("PATCH", "/api/collections/applied_capes",
           {"listRule": "", "viewRule": "", "createRule": "", "updateRule": "", "deleteRule": ""},
           token=token)
print("Result:", json.dumps(res2)[:300])

# Test write
print("\nTesting unauthenticated write...")
res3 = req("POST", "/api/collections/applied_capes/records",
           {"username": "test_user", "texture_url": "http://test.com/cape.png",
            "cape_name": "Test", "cape_category": "normal", "applied_at": "2025-01-01T00:00:00Z"})
print("Write test:", json.dumps(res3)[:200])
