import os
import subprocess
import textwrap
from pathlib import Path


def test_builder_creates_frontend_build(tmp_path):
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
if [ "$1" = "ci" ]; then
  exit 0
fi
if [ "$1" = "run" ] && [ "$2" = "build" ]; then
  mkdir -p "$PWD/build"
  cat > "$PWD/build/index.html" <<'HTML'
<!doctype html><html><body>built</body></html>
HTML
  exit 0
fi
exit 0
"""
        )
    )
    fake_npm.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"

    script = Path("/app/agent/build.sh")
    result = subprocess.run(
        ["bash", str(script)],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert (repo_root / "frontend" / "build" / "index.html").exists()


def test_builder_deploys_when_target_is_configured(tmp_path):
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
if [ "$1" = "ci" ]; then
  exit 0
fi
if [ "$1" = "run" ] && [ "$2" = "build" ]; then
  mkdir -p "$PWD/build"
  cat > "$PWD/build/index.html" <<'HTML'
<!doctype html><html><body>built</body></html>
HTML
  exit 0
fi
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
    fake_ssh.write_text("#!/usr/bin/env bash\nexit 0\n")
    fake_ssh.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"
    env["DEPLOY_HOST"] = "example.com"
    env["DEPLOY_USER"] = "deploy"
    env["DEPLOY_PATH"] = "/tmp/site"
    env["DEPLOY_KEY"] = ""

    script = Path("/app/agent/build.sh")
    result = subprocess.run(
        ["bash", str(script)],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert (repo_root / "scp-args.txt").exists()
    assert (repo_root / "frontend" / "build" / "index.html").exists()


def test_builder_rejects_forced_deploy_without_target(tmp_path):
    repo_root = tmp_path / "repo"
    frontend_dir = repo_root / "frontend"
    frontend_dir.mkdir(parents=True)
    (frontend_dir / "package.json").write_text('{"name":"frontend"}\n')

    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    fake_npm = fake_bin / "npm"
    fake_npm.write_text(
        "#!/usr/bin/env bash\nmkdir -p \"$PWD/build\"\ntouch \"$PWD/build/index.html\"\n"
    )
    fake_npm.chmod(0o755)

    env = os.environ.copy()
    env["PATH"] = f"{fake_bin}:{env['PATH']}"
    for key in ("DEPLOY_HOST", "DEPLOY_USER", "DEPLOY_PATH"):
        env.pop(key, None)

    result = subprocess.run(
        ["bash", "/app/agent/build.sh", "--no-install", "--deploy"],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 2
    assert "requires DEPLOY_HOST, DEPLOY_USER, and DEPLOY_PATH" in result.stderr


def test_builder_deploys_with_password_auth(tmp_path):
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
if [ "$1" = "ci" ]; then
  exit 0
fi
if [ "$1" = "run" ] && [ "$2" = "build" ]; then
  mkdir -p "$PWD/build"
  cat > "$PWD/build/index.html" <<'HTML'
<!doctype html><html><body>built</body></html>
HTML
  exit 0
fi
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
printf '%s\n' "$@" > "$PWD/sshpass-args.txt"
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

    script = Path("/app/agent/build.sh")
    result = subprocess.run(
        ["bash", str(script)],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    sshpass_command = (repo_root / "sshpass-args.txt").read_text()
    assert "scp" in sshpass_command or "ssh" in sshpass_command
