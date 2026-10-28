"""يصغّر الصور ويضغطها بنفس أسمائها (علشان الصفحة تفتح أسرع).
الاستخدام:  python compress_images.py  [مسار_فولدر_الصور]
النتيجة تتحفظ في فولدر images_optimized (انسخها بعدين مكان الأصلية).
محتاج مكتبة Pillow:  pip install pillow"""
import sys, pathlib
from PIL import Image, ImageOps
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
out = pathlib.Path("images_optimized"); out.mkdir(exist_ok=True)
for f in sorted(src.glob("*")):
    if f.suffix.lower() not in (".jpg", ".jpeg", ".png"): continue
    im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    im.thumbnail((1200, 1200))
    # منيو الورق محتاج دقة أعلى لقراءة الأسعار
    im.save(out / (f.stem + ".jpg"), "JPEG", quality=82, optimize=True, progressive=True)
    print("✓", f.name, f"{f.stat().st_size//1024}KB →", f"{(out/(f.stem+'.jpg')).stat().st_size//1024}KB")
