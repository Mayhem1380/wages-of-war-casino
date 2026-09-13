from pathlib import Path


def test_backend_dockerfile_runs_uvicorn_on_render_port():
    dockerfile = (Path(__file__).resolve().parents[1] / "backend" / "Dockerfile").read_text()

    assert 'uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}' in dockerfile


def test_frontend_nginx_no_longer_assumes_local_backend_container():
    nginx_conf = (Path(__file__).resolve().parents[1] / "frontend" / "nginx.conf").read_text()

    assert "proxy_pass http://backend:8000/api/" not in nginx_conf
    assert "try_files $uri $uri/ /index.html;" in nginx_conf


def test_render_blueprint_includes_required_managed_production_settings():
    render_yaml = (Path(__file__).resolve().parents[1] / "render.yaml").read_text()

    assert "healthCheckPath: /health" in render_yaml
    assert "healthCheckPath: /" in render_yaml
    assert "ENVIRONMENT" in render_yaml
    assert "NOWPAYMENTS_API_KEY" in render_yaml
    assert "NOWPAYMENTS_IPN_SECRET" in render_yaml
    assert "NOWPAYMENTS_BASE_URL" in render_yaml
    assert "VAULT_API_URL" in render_yaml
    assert "VAULT_API_KEY" in render_yaml
    assert "VAULT_PLATFORM" in render_yaml
    assert "REACT_APP_BACKEND_URL" in render_yaml


def test_readme_documents_render_cutover_flow():
    readme = (Path(__file__).resolve().parents[1] / "README.md").read_text()

    assert "## Controlled Render deployment" in readme
    assert "Verify the backend Render service passes `/health`" in readme
    assert "Point `wagesofwarcasin0.online` at the frontend service you control" in readme


def test_frontend_metadata_matches_wages_of_war_branding():
    index_html = (Path(__file__).resolve().parents[1] / "frontend" / "public" / "index.html").read_text()

    assert '<title>Wages of War Casino | Night Ops Edition</title>' in index_html
    assert 'content="Wages of War Casino — premium night-ops slots, flagship casino worlds, and operator-ready gaming from Wages of War."' in index_html
    assert "Nexus Studio Master Global Fleet Gaming" not in index_html
