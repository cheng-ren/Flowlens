"""
生成占位应用图标 resources/icon.png（512x512）
纯 Python 标准库，无需任何第三方依赖

用法：python3 scripts/generate-icon.py
"""
import struct, zlib, os, math

def crc32(data: bytes) -> int:
    return zlib.crc32(data) & 0xFFFFFFFF

def png_chunk(tag: bytes, data: bytes) -> bytes:
    payload = tag + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", crc32(payload))

def make_icon_png(size: int = 512) -> bytes:
    cx, cy, r = size / 2, size / 2, size * 0.42

    rows = bytearray()
    for y in range(size):
        rows.append(0)  # PNG filter: None
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx * dx + dy * dy)

            # 背景色（深海军蓝）
            bg = (13, 17, 23)
            # 圆形渐变（accent 蓝 → violet）
            t = max(0.0, 1.0 - dist / r)
            accent = (
                int(77  + (129 - 77)  * (1 - t)),
                int(156 + (140 - 156) * (1 - t)),
                int(240 + (248 - 240) * (1 - t)),
            )

            if dist < r:
                alpha = min(1.0, (r - dist) / 2)
                px = tuple(int(bg[i] * (1 - alpha) + accent[i] * alpha) for i in range(3))
            else:
                px = bg

            rows.extend(px)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(rows), 6)

    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", idat)
        + png_chunk(b"IEND", b"")
    )

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "resources", "icon.png")
    out = os.path.normpath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)

    if os.path.exists(out):
        print(f"[icon] already exists, skipping: {out}")
    else:
        png = make_icon_png(512)
        with open(out, "wb") as f:
            f.write(png)
        print(f"[icon] generated placeholder icon: {out}  ({len(png):,} bytes)")
        print("[icon] replace with a real icon when ready")
