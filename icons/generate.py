#!/usr/bin/env python3
"""Render PWA icon PNGs from the DNA-grid design in source.svg.

Composition (source 64-px coords): 3x3 raster of circles at x,y in {18,32,46},
radius 3. Five are inactive (#303338), four are amber (#f2a73c). Background
is a rounded-corner #15181b.

Run from inside ~/shred/icons/:
    python3 generate.py
"""
from PIL import Image, ImageDraw

BG       = (21, 24, 27)        # #15181b
DOT_OFF  = (48, 51, 56)        # #303338
DOT_ON   = (242, 167, 60)      # #f2a73c
RADIUS_BG = 15 / 64

POSITIONS = [18, 32, 46]
ACTIVE = {(46, 32), (32, 32), (32, 46), (18, 46)}
DOT_R = 3


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def render(size, out_path):
    s = size / 64.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    bg = Image.new("RGB", (size, size), BG)
    mask = rounded_mask(size, int(RADIUS_BG * size))
    img.paste(bg, (0, 0), mask)

    d = ImageDraw.Draw(img)
    r = max(2, int(DOT_R * s))
    for x in POSITIONS:
        for y in POSITIONS:
            cx, cy = int(x * s), int(y * s)
            color = DOT_ON if (x, y) in ACTIVE else DOT_OFF
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    img.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path} ({size}×{size})")


if __name__ == "__main__":
    render(512, "icon-512.png")
    render(192, "icon-192.png")
    render(180, "apple-touch-icon.png")
    render(1024, "icon-1024.png")
