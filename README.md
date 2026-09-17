# 打地鼠 WHACK-A-MOLE 🐹

復古像素街機風的打地鼠網頁遊戲，可在瀏覽器直接遊玩。

## 🔗 遊玩連結

**https://lbn960808-dev.github.io/whack-a-mole/**

## 玩法

- 看到地鼠出現在格子裡就**打下去**！普通地鼠 10 分、金色地鼠 50 分
- 連續命中累積 **COMBO**，連擊越高分數加乘越大（最高 ×5）
- 打中空洞會重置連擊，別盲目連打
- 三種難度：簡單／一般／困難
- 最高分會記錄在本機（localStorage）

## 技術

- 純前端：HTML + CSS + JavaScript（無框架、無相依套件）
- 音效以 Web Audio API 即時合成，不需外部檔案
- 地鼠為 16×16 像素點陣精靈（SVG rect 產生）
- 響應式設計，支援滑鼠與觸控

## 本機開發

```bash
python3 -m http.server 8765
# 開啟 http://localhost:8765
```

或直接雙擊 `index.html`。

## 部署

使用 GitHub Pages（分支 `main` / 根目錄）自動發布，Push 到 `main` 即更新。`ci.yml` 為 CI 檢查。
