import os
import subprocess
from pathlib import Path


def test_set_gh_secrets_usage_does_not_execute_example_substitution():
    repo_root = Path(__file__).resolve().parents[1]
    script = repo_root / "scripts" / "set-gh-secrets.sh"

    env = os.environ.copy()
    for key in (
        "GITHUB_REPO",
        "DEPLOY_HOST",
        "DEPLOY_USER",
        "DEPLOY_PATH",
        "DEPLOY_KEY",
        "DEPLOY_PASSWORD",
    ):
        env.pop(key, None)

    result = subprocess.run(
        ["bash", str(script)],
        cwd=repo_root,
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 1
    assert "Usage: export values then run this script" in result.stdout
    assert "cat:" not in result.stderr
