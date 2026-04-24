# 应用图标说明

请在此目录放置以下图标文件，打包时会自动使用：

## 必需文件

| 文件名 | 格式 | 尺寸 | 用途 |
|--------|------|------|------|
| `icon.png` | PNG | **512×512** 以上 | 通用源图（electron-builder 自动转换） |
| `icon.icns` | ICNS | macOS 多尺寸合集 | Mac 专用图标 |
| `icon.ico` | ICO | 多尺寸合集 | Windows 专用图标 |

## 最简方案

只放一张 **512×512 的 `icon.png`**，electron-builder 会自动转换为 `.icns` 和 `.ico`。

## 制作工具

- **在线转换**：https://cloudconvert.com/png-to-icns
- **命令行（Mac）**：
  ```bash
  # PNG → ICNS（需要 Xcode 命令行工具）
  mkdir icon.iconset
  sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
  sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
  sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
  sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
  sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
  sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
  sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
  sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
  sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
  cp icon.png            icon.iconset/icon_512x512@2x.png
  iconutil -c icns icon.iconset
  rm -rf icon.iconset
  ```
