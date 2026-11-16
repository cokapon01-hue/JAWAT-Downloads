"""App icons built from the shop logo (brand/logo.png): logo centred on a white tile."""
import sys, os
from PIL import Image, ImageDraw

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
logo = Image.open(os.path.join(ROOT, 'brand', 'logo.png')).convert('RGBA')

def draw(size, maskable=False, rounded=True):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=(255, 255, 255, 255))
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=(255, 255, 255, 255))
    box = S * (0.62 if maskable else 0.82)
    k = min(box / logo.width, box / logo.height)
    lg = logo.resize((round(logo.width * k), round(logo.height * k)), Image.LANCZOS)
    im.alpha_composite(lg, ((S - lg.width) // 2, (S - lg.height) // 2))
    return im.resize((size, size), Image.LANCZOS)

draw(192).save(os.path.join(out, 'icon-192.png'), optimize=True)
draw(512).save(os.path.join(out, 'icon-512.png'), optimize=True)
draw(512, maskable=True).save(os.path.join(out, 'maskable-512.png'), optimize=True)
draw(180, rounded=False).convert('RGB').save(os.path.join(out, 'apple-touch-icon.png'), optimize=True)
print('icons ok')
