import sys, os
from PIL import Image, ImageDraw

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
BLUE = (10, 116, 184); WHITE = (255, 255, 255)
CMYK = [(0, 163, 224), (228, 0, 124), (255, 210, 0), (27, 27, 27)]

def draw(size, maskable=False, rounded=True):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=BLUE)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BLUE)
    pad = S * (0.26 if maskable else 0.18)
    # the sign: a white banner with eyelets and a CMYK print strip
    x0, x1 = pad, S - pad
    y0, y1 = S * 0.30, S * 0.66
    if maskable:
        y0, y1 = S * 0.34, S * 0.64
    d.rounded_rectangle([x0, y0, x1, y1], radius=int(S * 0.03), fill=WHITE)
    r = S * 0.022
    inset = S * 0.045
    for cx in (x0 + inset, x1 - inset):
        for cy in (y0 + inset, y1 - inset):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BLUE)
    sw = (x1 - x0 - 2 * inset * 2) / 4
    sy0, sy1 = (y0 + y1) / 2 - S * 0.035, (y0 + y1) / 2 + S * 0.035
    for i, c in enumerate(CMYK):
        sx = x0 + inset * 2 + i * sw
        d.rectangle([sx, sy0, sx + sw, sy1], fill=c)
    # price tag line under the sign
    ly = y1 + S * 0.08
    d.rounded_rectangle([x0 + S * 0.12, ly, x1 - S * 0.12, ly + S * 0.045], radius=int(S * 0.02), fill=(255, 255, 255, 170))
    return im.resize((size, size), Image.LANCZOS)

draw(192).save(os.path.join(out, 'icon-192.png'))
draw(512).save(os.path.join(out, 'icon-512.png'))
draw(512, maskable=True).save(os.path.join(out, 'maskable-512.png'))
draw(180, rounded=False).convert('RGB').save(os.path.join(out, 'apple-touch-icon.png'))
print('icons ok')
