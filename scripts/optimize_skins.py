import os
from PIL import Image

skins_dir1 = r'E:\talesItem\frontend\public\img\skins'
skins_dir2 = r'E:\talesItem\public\img\skins'

for skins_dir in [skins_dir1, skins_dir2]:
    for f in os.listdir(skins_dir):
        if f.endswith(('.png', '.jpg', '.jpeg')):
            p = os.path.join(skins_dir, f)
            try:
                im = Image.open(p)
                # Convert to RGB (if RGBA)
                if im.mode in ('RGBA', 'LA'):
                    bg = Image.new('RGB', im.size, (15, 23, 42))
                    bg.paste(im, mask=im.split()[-1])
                    im_rgb = bg
                else:
                    im_rgb = im.convert('RGB')
                
                # Resize if > 1280
                if max(im_rgb.size) > 1280:
                    im_rgb.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
                
                # Save optimized JPEG
                base_name = os.path.splitext(f)[0]
                out_jpg = os.path.join(skins_dir, f'{base_name}.jpg')
                im_rgb.save(out_jpg, 'JPEG', quality=85, optimize=True)
                
                # Also keep PNG version but compressed/optimized
                if f.endswith('.png'):
                    im_rgb.save(p, 'JPEG', quality=85, optimize=True)
                
                sz = os.path.getsize(out_jpg)
                print(f'{f} -> {sz / 1024:.1f} KB')
            except Exception as e:
                print(f'Error {f}: {e}')

print('All skins optimized!')
