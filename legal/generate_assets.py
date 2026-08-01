"""
Generate Tuzi Play Store assets using the real logo.jpg:
  - app-icon-512.png         (512x512)
  - feature-graphic-1024x500.png  (1024x500)
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import math
import os

FONTS   = r"C:\Users\toann\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\177f26c8-55e6-4978-9fba-de3f49e8267d\3199b7eb-3758-40d2-895c-4b054069ed72\skills\canvas-design\canvas-fonts"
OUT     = r"D:\Lap trinh\Claude\tuvi-app\legal"
LOGO_SRC = r"D:\Lap trinh\Claude\tuvi-app\assets\logo.jpg"

def F(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

# Sample background colour from logo corner (top-left 12x12 average)
def sample_bg(logo: Image.Image):
    arr = np.array(logo.convert("RGB"))
    patch = arr[:12, :12]
    return tuple(patch.mean(axis=(0,1)).astype(int).tolist())

# Sparkle helper
def sparkle(d, x, y, s, c):
    x, y, s = int(x), int(y), max(2, int(s))
    lw  = max(1, s // 5)
    lw2 = max(1, s // 8)
    d.line([x-s, y,   x+s, y  ], fill=c, width=lw)
    d.line([x,   y-s, x,   y+s], fill=c, width=lw)
    d2 = int(s * 0.55)
    d.line([x-d2, y-d2, x+d2, y+d2], fill=c, width=lw2)
    d.line([x+d2, y-d2, x-d2, y+d2], fill=c, width=lw2)
    d.ellipse([x-lw, y-lw, x+lw, y+lw], fill=c)

# Gold text with drop-shadow
def gtext(d, x, y, text, font, col=(210,175,52), anchor="mm"):
    d.text((x+2, y+2), text, fill=(70, 50, 8),  font=font, anchor=anchor)
    d.text((x,   y  ), text, fill=col,            font=font, anchor=anchor)

# Radial navy gradient background
def make_bg(W, H, base_col):
    r0, g0, b0 = base_col
    dark = (max(r0-10,0), max(g0-10,0), max(b0-10,0))
    x = np.linspace(-1, 1, W); y = np.linspace(-1, 1, H)
    xx, yy = np.meshgrid(x, y)
    t = np.clip(np.sqrt(xx**2 + yy**2) / 1.5, 0, 1)
    img = np.zeros((H, W, 3), dtype=np.uint8)
    for c, (lo, hi) in enumerate(zip(base_col, dark)):
        img[:,:,c] = (lo + t*(hi-lo)).astype(np.uint8)
    return Image.fromarray(img, "RGB")

# Circular crop of logo (RGBA, anti-aliased edge)
def circle_crop(logo_img: Image.Image, size: int) -> Image.Image:
    logo = logo_img.convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([0, 0, size-1, size-1], fill=255)
    # soften edge
    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.2))
    out = Image.new("RGBA", (size, size), (0,0,0,0))
    out.paste(logo, mask=mask)
    return out

# ══════════════════════════════════════════════════════════════════
#  APP ICON  512x512
# ══════════════════════════════════════════════════════════════════
def build_icon():
    logo_orig = Image.open(LOGO_SRC)
    bg_col    = sample_bg(logo_orig)

    W = H = 512
    # Just resize the logo to exactly 512x512 — background matches
    icon = logo_orig.convert("RGB").resize((W, H), Image.LANCZOS)
    path = os.path.join(OUT, "app-icon-512.png")
    icon.save(path)
    print(f"  icon saved -> {path}")


# ══════════════════════════════════════════════════════════════════
#  FEATURE GRAPHIC  1024x500  (rendered 2x then halved)
# ══════════════════════════════════════════════════════════════════
def build_feature():
    S = 2
    W, H = 1024*S, 500*S   # 2048 x 1000

    logo_orig = Image.open(LOGO_SRC)
    bg_col    = sample_bg(logo_orig)

    # Background matching exact logo colour
    canvas = make_bg(W, H, bg_col)
    d      = ImageDraw.Draw(canvas)

    GOLD_D  = (155, 115, 18)
    GOLD_M  = (210, 175, 52)
    GOLD_L  = (248, 220, 90)

    # ── LEFT: logo (circular crop, blends into bg) ──────────────
    logo_size = int(H * 0.86)          # 860px at 2x
    logo_circ = circle_crop(logo_orig, logo_size)

    lx = int(W * 0.215)                # logo centre-x
    ly = H // 2
    paste_x = lx - logo_size // 2
    paste_y = ly - logo_size // 2
    canvas.paste(logo_circ, (paste_x, paste_y), logo_circ)

    # Subtle outer glow ring around logo
    ring_R = logo_size // 2 + 8
    d.ellipse([lx-ring_R, ly-ring_R, lx+ring_R, ly+ring_R],
              outline=GOLD_D, width=3)
    d.ellipse([lx-ring_R-8, ly-ring_R-8, lx+ring_R+8, ly+ring_R+8],
              outline=(90, 68, 10), width=2)

    # ── VERTICAL SEPARATOR ──────────────────────────────────────
    sep_x = int(W * 0.425)
    for i, alpha in enumerate([50, 100, 50]):
        shade = tuple(int(GOLD_D[k] * alpha/100) for k in range(3))
        d.line([sep_x+i*3, H//6, sep_x+i*3, H*5//6], fill=shade, width=2)

    # ── RIGHT: text block ────────────────────────────────────────
    tx  = int(W * 0.715)      # horizontal centre
    ty0 = int(H * 0.37)       # vertical centre of title

    # "Tuzi" — Italiana, tall elegant serif
    f_title = F("Italiana-Regular.ttf", 230)
    gtext(d, tx, ty0, "Tuzi", f_title, GOLD_L, anchor="mm")

    # Thin rule
    rw = int(W * 0.255)
    rule_y = ty0 + 130
    d.line([tx-rw, rule_y, tx+rw, rule_y], fill=GOLD_D, width=3)

    # Subtitle — WorkSans Bold (full Vietnamese Unicode support)
    f_sub = F("WorkSans-Bold.ttf", 48)
    gtext(d, tx, rule_y + 70, "Tử Vi  •  Bát Tự  •  Phong Thủy",
          f_sub, GOLD_M, anchor="mm")

    # Tagline — WorkSans Regular
    f_tag = F("WorkSans-Regular.ttf", 34)
    d.text((tx, rule_y + 150),
           "Khám phá vận mệnh theo lá số phương Đông",
           fill=(165, 135, 50), font=f_tag, anchor="mm")

    # ── SPARKLES ─────────────────────────────────────────────────
    for sx, sy, ss in [
        (100, 100, 20), (W-100, 90, 22), (90, H-100, 18), (W-90, H-90, 20),
        (int(W*0.54), 70, 16), (int(W*0.82), H-80, 14),
        (int(W*0.93), H//2-90, 12), (int(W*0.51), H//2+110, 10),
        (int(W*0.62), 50, 10), (int(W*0.78), H-55, 10),
    ]:
        sparkle(d, sx, sy, ss, GOLD_M)

    final = canvas.resize((1024, 500), Image.LANCZOS)
    path  = os.path.join(OUT, "feature-graphic-1024x500.png")
    final.save(path)
    print(f"  feature saved -> {path}")


print("Generating Tuzi store assets ...")
build_icon()
build_feature()
print("Done.")
