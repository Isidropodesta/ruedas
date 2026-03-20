#!/usr/bin/env python3.13
"""
Genera fotos de vehículos usando AI Horde (gratis, sin API key).
Uso:
  python3.13 generate_photos_horde.py                  → todos los autos
  python3.13 generate_photos_horde.py --id 5           → solo id=5
  python3.13 generate_photos_horde.py --company 2      → solo empresa id=2
  python3.13 generate_photos_horde.py --dry-run        → muestra sin llamar API
"""

import sys, os, json, time, io, re, urllib.request, urllib.parse, urllib.error, ssl
import psycopg2
from dotenv import load_dotenv
from PIL import Image

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

DATABASE_URL = os.environ['DATABASE_URL']
PUBLIC_DIR   = os.path.join(os.path.dirname(__file__), '..', 'front', 'public', 'autos')

HORDE_URL    = 'https://aihorde.net/api/v2'
HORDE_KEY    = '0000000000'  # anonymous — no account needed
HORDE_MODEL  = 'Deliberate'  # realistic photos, 0-queue most of the time
POLL_INTERVAL = 5   # seconds between status checks
MAX_WAIT     = 300  # give up after 5 minutes per image

DRY_RUN = '--dry-run' in sys.argv
ID_ARG  = None
CO_ARG  = None
for i, arg in enumerate(sys.argv):
    if arg == '--id'      and i + 1 < len(sys.argv): ID_ARG = int(sys.argv[i+1])
    if arg == '--company' and i + 1 < len(sys.argv): CO_ARG = int(sys.argv[i+1])

PHOTOS = [
    ('general.jpg',          'general view'),
    ('delantera.jpg',        'front view'),
    ('trasera.jpg',          'rear view'),
    ('lateral-izquierdo.jpg','left side view'),
    ('lateral-derecho.jpg',  'right side view'),
    ('interior.jpg',         'interior view'),
]

SSL_CTX = ssl.create_default_context()

def slug(s):
    s = str(s).lower()
    s = s.replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u')
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'[^a-z0-9\-]', '', s)
    return s

def vehicle_seed(vid, brand, model):
    key = f"{vid}-{brand}-{model}".lower()
    h = 0
    for c in key:
        h = (h * 31 + ord(c)) & 0xffffffff
    return abs(h) % 1000000

def horde_request(method, path, data=None):
    url = HORDE_URL + path
    headers = {
        'Content-Type': 'application/json',
        'apikey': HORDE_KEY,
        'User-Agent': 'RuedasApp/1.0',
        'Client-Agent': 'RuedasApp:1.0:contact@ruedas.app',
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
        return json.loads(resp.read())

def generate_image(prompt, seed):
    """Submit job and wait. Returns raw JPEG bytes or raises."""
    payload = {
        'prompt': prompt,
        'params': {
            'sampler_name': 'k_euler',
            'cfg_scale': 7.5,
            'steps': 20,
            'width': 512,
            'height': 512,
            'n': 1,
            'seed': str(seed),
        },
        'models': [HORDE_MODEL],
        'nsfw': False,
        'trusted_workers': False,
        'slow_workers': True,
        'shared': False,
    }
    result = horde_request('POST', '/generate/async', payload)
    job_id = result['id']

    elapsed = 0
    while elapsed < MAX_WAIT:
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL
        status = horde_request('GET', f'/generate/check/{job_id}')
        if status.get('done'):
            break
        wait_time = status.get('wait_time', '?')
        sys.stdout.write(f'\r   ⏳ {elapsed}s elapsed, ~{wait_time}s remaining...  ')
        sys.stdout.flush()
    else:
        raise TimeoutError(f'Job {job_id} timed out after {MAX_WAIT}s')

    sys.stdout.write('\r' + ' ' * 60 + '\r')
    final = horde_request('GET', f'/generate/status/{job_id}')
    gens  = final.get('generations', [])
    if not gens:
        raise RuntimeError(f'No generations returned: {final}')

    img_url = gens[0]['img']
    img_req  = urllib.request.Request(img_url)
    with urllib.request.urlopen(img_req, timeout=60, context=SSL_CTX) as resp:
        webp_data = resp.read()

    # Convert WebP → JPEG with Pillow
    img = Image.open(io.BytesIO(webp_data)).convert('RGB')
    out = io.BytesIO()
    img.save(out, 'JPEG', quality=90)
    return out.getvalue()

def placeholder_svg(brand, model, year, angle_file):
    angle = angle_file.replace('.jpg','').replace('-',' ')
    return f'''<svg width="800" height="450" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="450" fill="#1e1e1e"/>
  <rect x="2" y="2" width="796" height="446" fill="none" stroke="#333" stroke-width="2"/>
  <text x="400" y="245" font-family="Arial" font-size="24" font-weight="bold" fill="#666" text-anchor="middle">{brand} {model}</text>
  <text x="400" y="278" font-family="Arial" font-size="16" fill="#555" text-anchor="middle">{year}</text>
  <text x="400" y="310" font-family="Arial" font-size="14" fill="#444" text-anchor="middle">{angle}</text>
  <text x="400" y="435" font-family="Arial" font-size="11" fill="#333" text-anchor="middle">Imagen no disponible</text>
</svg>'''.encode('utf-8')

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()

    if ID_ARG:
        cur.execute('SELECT id, brand, model, year, color FROM vehicles WHERE id = %s ORDER BY id', (ID_ARG,))
    elif CO_ARG:
        cur.execute('SELECT id, brand, model, year, color FROM vehicles WHERE company_id = %s ORDER BY id', (CO_ARG,))
    else:
        cur.execute('SELECT id, brand, model, year, color FROM vehicles ORDER BY id')

    vehicles = cur.fetchall()
    if not vehicles:
        print('\nNo se encontraron vehículos.\n')
        conn.close(); return

    print(f'\n🚗 Vehículos: {len(vehicles)}  |  Imágenes máximas: {len(vehicles) * len(PHOTOS)}')
    print(f'   Motor: AI Horde / {HORDE_MODEL} (sin API key)')
    if DRY_RUN: print('   [DRY-RUN]\n')
    else:        print(f'   Destino: {os.path.abspath(PUBLIC_DIR)}\n')

    generated = skipped = errors = placeholders = 0

    for (vid, brand, model, year, color) in vehicles:
        brand_slug = slug(brand)
        model_slug = slug(model)
        dir_path   = os.path.join(PUBLIC_DIR, brand_slug, model_slug, str(year))
        color      = color or 'white'
        seed       = vehicle_seed(vid, brand, model)

        print(f'\n📦 {brand} {model} {year} — {color} (id:{vid}, seed:{seed})')

        if not DRY_RUN:
            os.makedirs(dir_path, exist_ok=True)

        for (fname, angle) in PHOTOS:
            fpath   = os.path.join(dir_path, fname)
            rel_url = f'/autos/{brand_slug}/{model_slug}/{year}/{fname}'

            if not DRY_RUN and os.path.exists(fpath):
                print(f'   ⏭  {fname} — ya existe')
                skipped += 1
                continue

            prompt = (
                f'Professional photo of {year} {brand} {model} in {color}, '
                f'{angle}, white background, high quality, photorealistic, car dealership style'
            )

            if DRY_RUN:
                print(f'   🔍 [dry] {fname}')
                print(f'          "{prompt}"')
                continue

            sys.stdout.write(f'   ⏳ {fname} ... ')
            sys.stdout.flush()

            saved = False
            try:
                jpg_bytes = generate_image(prompt, seed)
                with open(fpath, 'wb') as f:
                    f.write(jpg_bytes)
                print(f'✅  ({len(jpg_bytes)//1024}KB)')
                generated += 1
                saved = True
            except urllib.error.HTTPError as e:
                body = e.read()[:300]
                print(f'❌  HTTP {e.code}: {body}')
            except Exception as e:
                print(f'❌  {type(e).__name__}: {e}')
                errors += 1
                try:
                    svg_path = fpath.replace('.jpg', '.svg')
                    with open(svg_path, 'wb') as f:
                        f.write(placeholder_svg(brand, model, year, fname))
                    placeholders += 1
                except Exception:
                    pass

            if saved:
                try:
                    cur.execute('SELECT id FROM vehicle_photos WHERE vehicle_id = %s AND url = %s', (vid, rel_url))
                    if not cur.fetchone():
                        cur.execute('INSERT INTO vehicle_photos (vehicle_id, url) VALUES (%s, %s)', (vid, rel_url))
                        conn.commit()
                except Exception as db_err:
                    print(f'   ⚠  DB insert fallido: {db_err}')

    print(f"\n{'─'*52}")
    print(f'✅ Generadas:     {generated}')
    print(f'⏭  Saltadas:      {skipped}')
    print(f'📋 Placeholders:  {placeholders}')
    print(f'❌ Errores:       {errors}')
    print(f"{'─'*52}\n")

    cur.close(); conn.close()

if __name__ == '__main__':
    main()
