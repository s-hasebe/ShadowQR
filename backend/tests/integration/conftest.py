"""結合テスト用フィクスチャ: 一時ディレクトリを SHADOWQR_WORK_DIR に注入する。"""
import pytest


@pytest.fixture(autouse=True)
def shadowqr_work_dir(tmp_path, monkeypatch):
    work = tmp_path / "shadowqr"
    work.mkdir()
    monkeypatch.setenv("SHADOWQR_WORK_DIR", str(work))
