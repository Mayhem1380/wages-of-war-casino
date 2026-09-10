import os
import subprocess
import textwrap
from pathlib import Path


def test_deploy_script_builds_missing_frontend_build(tmp_path):
    repo_root = tmp_path / "repo"
    frontend_dir = repo_root / "frontend"
    frontend_dir.mkdir(parents=True)
    (frontend_dir / "package.json").write_text('{"name":"frontend"}\n')

    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()

    fake_npm = fake_bin / "npm"
    fake_npm.write_text(
        textwrap.dedent(
            """#!/usr/bin/env bash
set -e
mkdir -p "$PWD/build"
cat > "$PWD/build/index.html" <<'HTML'
<!doctype html><html><body>built</body></html>
HTML
exit 0
"""
        )
    )
    fake_npm.chmod(0o755)

    fake_scp = fake_bin / "scp"
    fake_scp.write_text(
        textwrap.dedent(
            """#!/usr/bin/env bash
set -e
printf '%s\n' "$@" > "$PWD/scp-args.txt"
exit 0
"""
        )
    )
    fake_scp.chmod(0o755)

    fake_ssh = fake_bin / "ssh"
    fake_ssh.write_text(
        textwrap.dedent(
            """#!/usr/bin/env bash
set -e
printf '%s\n' "$@" > "$PWD/ssh-args.txt"
exit 0
"""
        )
    )
    fake_ssh.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"
    env["DEPLOY_HOST"] = "example.com"
    env["DEPLOY_USER"] = "deploy"
    env["DEPLOY_PATH"] = "/tmp/site"
    env["DEPLOY_KEY"] = ""

    script = Path("/app/agent/deploy.sh")
    result = subprocess.run(
        ["bash", str(script)],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    tarballs = list(repo_root.glob("wagesofwar_build_*.tar.gz"))
    assert not tarballs, "temporary tarball was not cleaned up"
    assert (repo_root / "frontend" / "build" / "index.html").exists()
    assert (repo_root / "scp-args.txt").exists()
    assert (repo_root / "ssh-args.txt").exists()
    ssh_command = (repo_root / "ssh-args.txt").read_text()
    assert "sha256sum -c" in ssh_command
    assert "ln -sfn" in ssh_command


def test_deploy_script_supports_password_auth(tmp_path):
    repo_root = tmp_path / "repo"
    frontend_dir = repo_root / "frontend"
    frontend_dir.mkdir(parents=True)
    (frontend_dir / "package.json").write_text('{"name":"frontend"}\n')

    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()

    fake_npm = fake_bin / "npm"
    fake_npm.write_text(
        textwrap.dedent(
            """#!/usr/bin/env bash
set -e
mkdir -p "$PWD/build"
cat > "$PWD/build/index.html" <<'HTML'
<!doctype html><html><body>built</body></html>
HTML
exit 0
"""
        )
    )
    fake_npm.chmod(0o755)

    fake_sshpass = fake_bin / "sshpass"
    fake_sshpass.write_text(
        textwrap.dedent(
            """#!/usr/bin/env bash
set -e
shift
shift
printf '%s\n' "$@" >> "$PWD/sshpass-args.txt"
printf -- '--\n' >> "$PWD/sshpass-args.txt"
exit 0
"""
        )
    )
    fake_sshpass.chmod(0o755)

    fake_scp = fake_bin / "scp"
    fake_scp.write_text("#!/usr/bin/env bash\nexit 0\n")
    fake_scp.chmod(0o755)

    fake_ssh = fake_bin / "ssh"
    fake_ssh.write_text("#!/usr/bin/env bash\nexit 0\n")
    fake_ssh.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"
    env["DEPLOY_HOST"] = "example.com"
    env["DEPLOY_USER"] = "deploy"
    env["DEPLOY_PATH"] = "/tmp/site"
    env["DEPLOY_KEY"] = ""
    env["DEPLOY_PASSWORD"] = "secret"

    script = Path("/app/agent/deploy.sh")
    result = subprocess.run(
        ["bash", str(script)],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    sshpass_command = (repo_root / "sshpass-args.txt").read_text()
    assert "scp" in sshpass_command
    assert "\nssh\n" in f"\n{sshpass_command}"
