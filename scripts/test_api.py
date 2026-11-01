import urllib.request
import urllib.parse
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = 'http://localhost:3000/api/items?q=' + urllib.parse.quote('ชุดกีฬา 20 ปี')
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))
print(f"Total matched: {data.get('total')}")
for it in data.get('items', [])[:6]:
    print(f"  ID {it['id']}: {it['name']} | icon: {it['icon_file']} | methods: {it['obtain_methods'][:1]}")
