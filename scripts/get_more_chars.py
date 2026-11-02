import urllib.request
import json

chars = ['Cain', 'Yeon_O', 'Bloody_Vera', 'Shionel', 'Roloa', 'Damyeon', 'Chloe', 'Sid', 'Narcissus', 'Haru']
headers = {'User-Agent': 'Mozilla/5.0'}
for c in chars:
    url = f'https://talesrunner.fandom.com/api.php?action=parse&page={c}&prop=images&format=json'
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            imgs = data.get('parse', {}).get('images', [])
            matched = [img for img in imgs if 'onstove' in img.lower() or 'render' in img.lower() or c.lower() in img.lower()]
            print(f'{c}: {matched[:3]}')
    except Exception as e:
        print(f'{c}: error {e}')
