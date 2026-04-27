# 应用资源目录

存放打包所需的静态资源，electron-builder 会自动读取。

## 图标文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `icon.png` | ✅ 已存在 | 512×512，通用源图，打包时自动转换为各平台格式 |
| `icon.icns` | 可选 | macOS 专用，不提供则由 `icon.png` 自动生成 |
| `icon.ico` | 可选 | Windows 专用，不提供则由 `icon.png` 自动生成 |

> 只需保留 `icon.png`（512×512 以上），electron-builder 会自动处理其余格式。

## 手动生成 ICNS（macOS）

```bash
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

需要 Xcode 命令行工具（`xcode-select --install`）。在线工具：<https://cloudconvert.com/png-to-icns>
