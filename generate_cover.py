"""
Generate the copilot-swarm cover image (2560x1280).
Dark violet base, soft indigo/magenta gradient blobs, a faint "swarm" node motif,
bold monospace title, muted subtitle, rounded corners. Build-time only; the PNG
ships, this script does not.
"""

import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 2560, 1280
CORNER_RADIUS = 80

# ── 1. Base canvas (near-black violet) ────────────────────────────────────────
base = Image.new("RGBA", (W, H), (11, 9, 18, 255))  # #0b0912

# ── 2. Color blobs (violet swarm palette) ─────────────────────────────────────
def make_blob(size, color_rgba, cx, cy, rx, ry):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color_rgba)
    return layer

blobs = [
    # (r,   g,   b,  alpha,  cx,    cy,   rx,   ry,  blur)
    (124,  58, 237, 190,   720,  560, 760, 520, 130),   # violet, center-left  (#7c3aed)
    (168,  85, 247, 150,  1980,  240, 620, 430, 110),   # purple, top-right
    ( 56,  30, 114, 200,  1280, 1180, 980, 380, 100),   # deep indigo, bottom
    (217,  70, 239, 120,  1500,  640, 480, 340,  90),   # magenta accent, center
    ( 37,  99, 235, 110,   240, 1050, 520, 360,  90),   # blue, bottom-left
]
canvas = base.copy()
for r, g, b, a, cx, cy, rx, ry, blur in blobs:
    blob = make_blob((W, H), (r, g, b, a), cx, cy, rx, ry).filter(ImageFilter.GaussianBlur(radius=blur))
    canvas = Image.alpha_composite(canvas, blob)
canvas = canvas.filter(ImageFilter.GaussianBlur(radius=8))

# ── 3. Swarm motif: scattered nodes + faint links ─────────────────────────────
rng = np.random.default_rng(7)
N = 46
pts = np.column_stack([rng.integers(120, W - 120, N), rng.integers(110, H - 110, N)])
swarm = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(swarm)
# links between nearby nodes
for i in range(N):
    for j in range(i + 1, N):
        d = math.dist(pts[i], pts[j])
        if d < 360:
            a = int(46 * (1 - d / 360))
            sd.line([tuple(pts[i]), tuple(pts[j])], fill=(196, 181, 253, a), width=2)
# nodes
for (x, y) in pts:
    rad = int(rng.integers(4, 11))
    sd.ellipse([x - rad, y - rad, x + rad, y + rad], fill=(216, 204, 255, 150))
swarm = swarm.filter(ImageFilter.GaussianBlur(radius=0.6))
canvas = Image.alpha_composite(canvas, swarm)

# ── 4. Fonts (macOS paths; build-time only) ───────────────────────────────────
def font(size, index):
    try:
        return ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", size, index=index)
    except Exception:
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", size)

font_badge = font(58, 0)
font_title = font(208, 1)
font_subtitle = font(62, 0)

draw = ImageDraw.Draw(canvas)

def centered(text, f, y, fill, shadow=True):
    bbox = draw.textbbox((0, 0), text, font=f)
    x = (W - (bbox[2] - bbox[0])) // 2 - bbox[0]
    if shadow:
        draw.text((x + 4, y + 5), text, font=f, fill=(0, 0, 0, 150))
    draw.text((x, y), text, font=f, fill=fill)

centered("⚡ CSW", font_badge, 250, (216, 204, 255, 235))
centered("copilot-swarm", font_title, 470, (245, 243, 255, 255))
centered("evidence-gated delivery governance · native GitHub Copilot CLI",
         font_subtitle, 760, (197, 188, 224, 230))

# ── 5. Rounded corners ────────────────────────────────────────────────────────
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, W, H], radius=CORNER_RADIUS, fill=255)
out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
out.paste(canvas, (0, 0), mask)

out.save("cover.png", optimize=True)
print(f"wrote cover.png ({W}x{H})")
