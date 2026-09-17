#!/usr/bin/env bash
# 專案初始化腳本：建立虛擬環境、安裝依賴、設定 pre-commit
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d ".venv" ]; then
    echo "[1/3] 建立 Python 虛擬環境..."
    python3 -m venv .venv
fi

echo "[2/3] 安裝專案依賴..."
. .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev]"

echo "[3/3] 安裝 pre-commit hooks..."
pre-commit install

echo "完成！執行: source .venv/bin/activate"
