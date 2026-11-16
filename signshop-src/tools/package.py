"""Pack the release zip: the app folder, the Thai readme, and the source for future updates."""
import os, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION = sys.argv[1]
APP = os.path.join(ROOT, 'dist', 'คิดราคาป้าย')
out = os.path.join(ROOT, f'คิดราคาป้าย-v{VERSION}.zip')

def add_tree(z, src, arc):
    for d, _, files in os.walk(src):
        for f in sorted(files):
            p = os.path.join(d, f)
            z.write(p, os.path.join(arc, os.path.relpath(p, src)))

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    readme = open(os.path.join(ROOT, 'อ่านก่อน.txt'), encoding='utf8').read().replace('__VERSION__', VERSION)
    z.writestr('อ่านก่อน.txt', '﻿' + readme.replace('\n', '\r\n'))
    add_tree(z, APP, 'คิดราคาป้าย')
    dev = '_สำหรับนักพัฒนา'
    add_tree(z, os.path.join(ROOT, 'src'), dev + '/src')
    for f in ['build_app.py', 'make_icons.py', 'test_app.js', 'package.py']:
        z.write(os.path.join(ROOT, 'tools', f), f'{dev}/tools/{f}')
    for f in ['changelog.json', 'DEVELOP.md', 'อ่านก่อน.txt', '.gitignore']:
        z.write(os.path.join(ROOT, f), f'{dev}/{f}')
print(out, os.path.getsize(out))
