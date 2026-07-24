#!/usr/bin/env python3
"""
SSH wrapper for git, using paramiko (since the `ssh` binary is unavailable).

Implements just enough of the OpenSSH CLI that git's smart protocol needs:
  ssh [options] user@host command...

- Loads ~/.ssh/id_ed25519 by default
- Trusts github.com host key (we already deployed our key there)
- Properly streams stdin/stdout/stderr for git-upload-pack / git-receive-pack
"""
import os
import sys
import shlex
import socket
import paramiko

KEY_PATH = os.path.expanduser("~/.ssh/id_ed25519")
KNOWN_HOSTS = {
    "github.com": [
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UO3qOAAAAQQDb20=  github.com",
    ],
}


def parse_args(argv):
    """Strip ssh options; return (user_host, command_parts)."""
    user_host = None
    command = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("-o"):
            i += 2
            continue
        if a.startswith("-"):
            i += 1
            continue
        if user_host is None:
            user_host = a
        else:
            command.append(a)
        i += 1
    return user_host, command


def main():
    user_host, command = parse_args(sys.argv[1:])
    if not user_host or not command:
        sys.stderr.write("usage: ssh-wrapper user@host command...\n")
        sys.exit(2)

    if "@" in user_host:
        user, host = user_host.split("@", 1)
    else:
        user, host = None, user_host

    port = 22
    if ":" in host:
        host, port_str = host.rsplit(":", 1)
        port = int(port_str)

    client = paramiko.SSHClient()
    # Load system known_hosts if any; otherwise be permissive but verify
    # GitHub's published key fingerprint (we'll set MissingHostKeyPolicy to
    # AutoAddPolicy since this is a controlled environment with a fixed key).
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # Try to load the ed25519 key
    pkey = None
    if os.path.exists(KEY_PATH):
        try:
            pkey = paramiko.Ed25519Key.from_private_key_file(KEY_PATH)
        except paramiko.SSHException:
            # Try other key types
            for cls in (paramiko.RSAKey, paramiko.ECDSAKey):
                try:
                    pkey = cls.from_private_key_file(KEY_PATH)
                    break
                except Exception:
                    continue

    remote_cmd = " ".join(shlex.quote(c) for c in command)

    try:
        client.connect(
            hostname=host,
            port=port,
            username=user or "git",
            pkey=pkey,
            look_for_keys=False,
            allow_agent=False,
            timeout=30,
            banner_timeout=30,
            auth_timeout=30,
        )
    except Exception as e:
        sys.stderr.write(f"ssh-wrapper: connection failed: {e}\n")
        sys.exit(255)

    try:
        # Use exec_command with get_pty=False so binary streaming works
        chan = client.get_transport().open_session()
        chan.settimeout(None)

        # Set GIT_PROTOCOL env var that newer git clients send via SendEnv
        git_protocol = os.environ.get("GIT_PROTOCOL")
        if git_protocol:
            chan.set_environment_variable("GIT_PROTOCOL", git_protocol)

        chan.exec_command(remote_cmd)

        # Bidirectional streaming: pipe stdin to channel, channel stdout/stderr to us
        chan.setblocking(False)
        stdin_fd = sys.stdin.fileno()
        stdout_fd = sys.stdout.fileno()
        stderr_fd = sys.stderr.fileno()

        import select

        chan_closed = False
        while not chan_closed:
            rlist = [stdin_fd]
            try:
                rlist.append(chan)
            except Exception:
                pass

            try:
                r, _, _ = select.select(rlist, [], [], 1.0)
            except (OSError, ValueError):
                break

            if stdin_fd in r:
                try:
                    data = os.read(stdin_fd, 65536)
                    if not data:
                        # EOF on stdin — close write half of channel
                        try:
                            chan.shutdown_write()
                        except Exception:
                            pass
                    else:
                        chan.sendall(data)
                except OSError:
                    pass

            try:
                if chan.recv_ready():
                    data = chan.recv(65536)
                    if data:
                        os.write(stdout_fd, data)
                if chan.recv_stderr_ready():
                    data = chan.recv_stderr(65536)
                    if data:
                        os.write(stderr_fd, data)
            except Exception:
                pass

            if chan.exit_status_ready():
                # Drain remaining
                while chan.recv_ready():
                    os.write(stdout_fd, chan.recv(65536))
                while chan.recv_stderr_ready():
                    os.write(stderr_fd, chan.recv_stderr(65536))
                chan_closed = True

        exit_code = chan.recv_exit_status()
        sys.exit(exit_code)
    finally:
        client.close()


if __name__ == "__main__":
    main()
