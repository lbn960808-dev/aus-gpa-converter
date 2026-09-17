# default-project

標準化全端專案範本（scaffold），包含 Python 後端與 Node.js 前端工具鏈的基礎設定，適用於開發複雜軟體專案。

## 環境需求

| 工具 | 版本 | 狀態 |
| ---- | ---- | ---- |
| [Git](https://git-scm.com/) | 2.50+ | ✅ 已安裝 |
| [Python](https://www.python.org/) | 3.13 | ✅ 已安裝 |
| [Node.js](https://nodejs.org/) | 24 LTS | ✅ 已安裝（透過 nvm） |
| [npm](https://www.npmjs.com/) | 11 | ✅ 已安裝 |
| [GitHub CLI](https://cli.github.com/) (`gh`) | 2.101 | ✅ 已安裝 |
| [pre-commit](https://pre-commit.com/) | 4.6 | ✅ 已安裝 |

> `gh` 安裝於 `~/gh-cli`，Python 使用者工具位於 `~/Library/Python/3.13/bin`，
> Node 由 `~/nvm`（nvm）管理。以上路徑已加入 `~/.zshrc`。

## 專案結構

```
.
├── .github/workflows/   # GitHub Actions CI
├── docs/                # 專案文件
├── scripts/             # 開發/部署腳本
├── src/app/             # 應用程式主程式碼
├── tests/               # 單元測試
├── .editorconfig        # 編輯器統一設定
├── .env.example         # 環境變數範本（複製為 .env 使用）
├── .gitignore
├── .pre-commit-config.yaml
├── Makefile             # 常用開發指令
├── package.json         # Node.js 專案設定
└── pyproject.toml       # Python 專案設定
```

## 快速開始

```bash
# 1. 建立虛擬環境並安裝依賴 + pre-commit
scripts/bootstrap.sh
# 或 make setup

# 2. 設定環境變數
cp .env.example .env

# 3. 執行測試
make test

# 4. 執行程式
make dev
```

## 常用指令

| 指令 | 說明 |
| ---- | ---- |
| `make setup` | 建立虛擬環境、安裝依賴與 pre-commit |
| `make test` | 執行 `pytest` 測試 |
| `make lint` | 使用 `ruff` 檢查程式碼 |
| `make format` | 使用 `ruff` 格式化程式碼 |
| `make dev` | 啟動開發伺服器 |

## 環境變數

所有環境變數皆由根目錄的 `.env` 提供（詳見 `.env.example`），
`.env` 已加入 `.gitignore`，請勿提交任何機密內容。

## Git 流程

- 分支以 `main` 為主，功能開發使用 feature branch。
- Commit 前自動執行 pre-commit hooks（格式、檢查）。
- Push 後由 GitHub Actions 執行 CI（矩陣測試 Python 3.11–3.13）。

## 授權

See [LICENSE](LICENSE)（如需要請補充）。
