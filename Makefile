.PHONY: setup test lint format clean dev

setup: ## 建立虛擬環境並安裝開發依賴
	python3 -m venv .venv
	. .venv/bin/activate && pip install -e ".[dev]"
	pre-commit install

test: ## 執行測試
	. .venv/bin/activate && pytest

lint: ## 使用 ruff 檢查程式碼
	. .venv/bin/activate && ruff check src tests

format: ## 使用 ruff 格式化程式碼
	. .venv/bin/activate && ruff format src tests

clean: ## 清除快取
	rm -rf .pytest_cache .ruff_cache .mypy_cache

dev: ## 啟動開發伺服器
	. .venv/bin/activate && python -m app.main
