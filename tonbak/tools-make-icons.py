#!/usr/bin/env python3
"""
Generates the Tonbak app icons with no image library — just zlib and struct.

Everything is drawn at 4x and box-downsampled, which is where the smooth
edges come from. The drum is built as a scanline profile (half-width as a
function of height) rather than a bezier path, since filling a profile is a
few lines and filling beziers is not.
"""

import math
import os
import struct
import zlib

SS = 4  # supersample factor
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")


# ── PNG ────────────────────────────────────────────────────────────────────
def write_png(path, w, h, pixels):
    """pixels: flat list of (r,g,b) ints, row-major."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filter: none
        row = pixels[y * w:(y + 1) * w]
        for (r, g, b) in row:
            raw += bytes((r, g, b))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


# ── helpers ────────────────────────────────────────────────────────────────
def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(3))


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


# Palette, matching the app's CSS.
BG_IN = (0x22, 0x29, 0x55)
BG_OUT = (0x0A, 0x0D, 0x1A)
GOLD = (0xE8, 0xB4, 0x4A)
GOLD_HI = (0xF8, 0xE0, 0xAA)
TURQ = (0x4F, 0xD1, 0xC5)
WOOD_HI = (0xA8, 0x70, 0x3E)
WOOD_MID = (0x74, 0x47, 0x25)
WOOD_LO = (0x38, 0x20, 0x11)
SKIN_HI = (0xF7, 0xE9, 0xCC)
SKIN_LO = (0xCF, 0xAE, 0x7C)
RIM = (0x2C, 0x18, 0x0C)


def drum_half_width(t):
    """Half-width of the tonbak body at vertical position t (0 = head, 1 = bell)."""
    if t < 0.0 or t > 1.0:
        return 0.0
    if t < 0.05:                        # head rim, straight-sided
        return 0.400
    if t < 0.30:                        # bowl, barely tapering
        return lerp(0.400, 0.345, smoothstep((t - 0.05) / 0.25))
    if t < 0.54:                        # shoulder drawing in to the stem
        return lerp(0.345, 0.150, smoothstep((t - 0.30) / 0.24))
    if t < 0.87:                        # stem, near-straight
        return lerp(0.150, 0.134, (t - 0.54) / 0.33)
    return lerp(0.134, 0.235, smoothstep((t - 0.87) / 0.13))  # bell flare


def render(size, pad_scale=1.0):
    """pad_scale < 1 shrinks the artwork, leaving a maskable safe zone."""
    S = size * SS
    cx = cy = S / 2.0

    # Artwork box — the drum sits inside the ring of dots, not over it.
    height = S * 0.615 * pad_scale
    drum_w = S * 0.520 * pad_scale
    top = cy - height * 0.50

    # Ring of cycle dots
    ring_r = S * 0.428 * pad_scale
    dots = []
    for i in range(12):
        a = (i / 12.0) * math.tau - math.pi / 2
        rr = S * (0.0175 if i % 3 == 0 else 0.0105) * pad_scale
        dots.append((cx + math.cos(a) * ring_r, cy + math.sin(a) * ring_r, rr))

    max_r = S * 0.72
    px = []

    for y in range(S):
        for x in range(S):
            dx = x - cx
            dy = y - cy
            d = math.hypot(dx, dy)

            # Background: radial fall-off, lifted slightly toward the top.
            g = smoothstep(min(1.0, d / max_r))
            lift = max(0.0, 1.0 - (y / S) * 1.7) * 0.16
            col = mix(BG_IN, BG_OUT, g)
            col = mix(col, (0x33, 0x3D, 0x74), lift * (1 - g))

            # Cycle dots
            for (ox, oy, orr) in dots:
                dd = math.hypot(x - ox, y - oy)
                if dd < orr:
                    col = GOLD if orr > S * 0.014 else mix(GOLD, TURQ, 0.35)
                    break

            # Drum body
            t = (y - top) / height
            if 0.0 <= t <= 1.0:
                hw = drum_half_width(t) * drum_w
                if abs(dx) <= hw:
                    # Fake cylindrical shading across the width.
                    u = dx / hw if hw > 0 else 0.0
                    shade = 1.0 - abs(u - (-0.28)) * 0.95
                    shade = max(0.0, min(1.0, shade))
                    if shade > 0.62:
                        wood = mix(WOOD_MID, WOOD_HI, (shade - 0.62) / 0.38)
                    else:
                        wood = mix(WOOD_LO, WOOD_MID, shade / 0.62)
                    col = wood

                    # Dark outline at the silhouette edge
                    if abs(abs(dx) - hw) < S * 0.006:
                        col = RIM

                    # Two gold bands around the stem
                    for band in (0.70, 0.76):
                        if abs(t - band) < 0.011:
                            col = mix(GOLD, WOOD_LO, 0.25)

            # Skin: a taut, nearly flat head. Kept shallow on purpose — a deep
            # ellipse reads as an open cup rather than a stretched membrane.
            # Centred exactly on the body's top edge, so the ellipse is at its
            # widest where the straight sides begin — the far rim reads above
            # it, the near rim over the shell.
            head_cy = top
            rx = 0.400 * drum_w
            ry = rx * 0.21
            e = ((x - cx) / rx) ** 2 + ((y - head_cy) / ry) ** 2
            if e <= 1.0:
                # Broad, low-contrast sheen from the upper left.
                sh = 0.62 - (dx / rx) * 0.20 - ((y - head_cy) / ry) * 0.16
                col = mix(SKIN_LO, SKIN_HI, max(0.0, min(1.0, sh)))
                # Lacing ring just inside the rim, then the rim itself.
                if 0.80 < e <= 0.88:
                    col = mix(col, SKIN_LO, 0.55)
                if e > 0.93:
                    col = mix(col, RIM, (e - 0.93) / 0.07)

            px.append(col)

    # Box-downsample to the requested size.
    out = []
    for y in range(size):
        for x in range(size):
            r = g_ = b = 0
            for sy in range(SS):
                base = (y * SS + sy) * S + x * SS
                for sx in range(SS):
                    c = px[base + sx]
                    r += c[0]; g_ += c[1]; b += c[2]
            n = SS * SS
            out.append((r // n, g_ // n, b // n))
    return out


def main():
    here = os.path.abspath(os.path.join(os.path.dirname(__file__)))
    icons = os.environ.get("ICON_DIR") or os.path.join(here, "icons")
    os.makedirs(icons, exist_ok=True)

    jobs = [
        ("icon-180.png", 180, 1.0),
        ("icon-192.png", 192, 1.0),
        ("icon-512.png", 512, 1.0),
        # Maskable icons get cropped to a circle by some launchers, so the
        # artwork sits inside the 80% safe zone.
        ("icon-maskable-512.png", 512, 0.76),
    ]
    for name, size, pad in jobs:
        pixels = render(size, pad)
        path = os.path.join(icons, name)
        write_png(path, size, size, pixels)
        print(f"{name}  {size}x{size}  {os.path.getsize(path):,} bytes")


if __name__ == "__main__":
    main()
