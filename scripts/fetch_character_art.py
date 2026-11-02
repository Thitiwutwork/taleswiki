import urllib.request
import json
import re

url = 'https://talesrunner.fandom.com/api.php?action=parse&page=Chowon&prop=text&format=json'
headers = {'User-Agent': 'Mozilla/5.0'}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    html = data['parse']['text']['*']
    imgs = re.findall(r'https://static\.wikia\.nocookie\.net/[^/]+/images/[^/]+/[^/]+/[^\"?]+', html)
    for img in sorted(set(imgs)):
        print(img)
