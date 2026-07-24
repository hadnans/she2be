#!/usr/bin/env python3
"""Generate an ed25519 SSH keypair compatible with OpenSSH."""
import os
import base64
import struct
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

SSH_DIR = Path.home() / ".ssh"
SSH_DIR.mkdir(mode=0o700, exist_ok=True, parents=True)

priv_path = SSH_DIR / "id_ed25519"
pub_path = SSH_DIR / "id_ed25519"

# 1) Generate key
private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

# 2) Serialize private key in OpenSSH format
priv_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.OpenSSH,
    encryption_algorithm=serialization.NoEncryption(),
)

# 3) Build OpenSSH public key string
pub_raw = public_key.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw,
)

# OpenSSH wire format for ed25519: string "ssh-ed25519", string <32-byte pubkey>
def ssh_string(b: bytes) -> bytes:
    return struct.pack(">I", len(b)) + b

blob = ssh_string(b"ssh-ed25519") + ssh_string(pub_raw)
b64 = base64.b64encode(blob).decode("ascii")
comment = "z-user@z-ai"
pub_line = f"ssh-ed25519 {b64} {comment}\n"

# 4) Write files with correct permissions
priv_path.write_bytes(priv_pem)
os.chmod(priv_path, 0o600)
pub_path.with_suffix(".pub").write_text(pub_line)
os.chmod(pub_path.with_suffix(".pub"), 0o644)

print("=== SSH keypair generated ===")
print(f"Private key: {priv_path}")
print(f"Public key : {pub_path.with_suffix('.pub')}")
print()
print("=== PUBLIC KEY (copy this to GitHub / servers) ===")
print(pub_line, end="")
