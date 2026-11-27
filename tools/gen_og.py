"""Buat kartu pratinjau 1200x630 (JPG) per event untuk og:image / twitter:image.

Kenapa perlu: poster event sebagian besar tautan luar (Supabase, infokonser.id, dst.) dengan rasio dan format
beragam (ada .webp). Banyak platform menolak atau memotong gambar seperti itu. Kartu ini dihosting di domain
sendiri (/og/<slug>.jpg), selalu JPG 1200x630, dan tetap terbentuk walau poster gagal diunduh.

Dipanggil dari build.py:  import gen_og; gen_og.build(EV, ROOT)
Butuh Pillow (pip install pillow). Tanpa Pillow atau tanpa jaringan, build tetap jalan dan memakai gambar bawaan.
"""
import os, io, re, hashlib, urllib.request

W, H = 1200, 630
BRAND, ACCENT = (14, 90, 70), (228, 80, 26)
UA = "Mozilla/5.0 (compatible; GoWithDME-OG/1.0; +https://gowithdme.com)"
FONT_DIRS = ["tools/fonts", "assets/fonts", "/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/opentype/inter"]
FONT_REG = ["PlusJakartaSans-Medium.ttf", "Inter-Medium.otf", "DejaVuSans.ttf"]
FONT_BOLD = ["PlusJakartaSans-ExtraBold.ttf", "Inter-Bold.otf", "DejaVuSans-Bold.ttf"]


def _font(ImageFont, root, names, size):
    for d in FONT_DIRS:
        base = d if os.path.isabs(d) else os.path.join(root, d)
        for n in names:
            p = os.path.join(base, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _poster(Image, url, root, cache):
    """Ambil poster: file lokal, atau unduh (di-cache). Gagal -> None."""
    if not url:
        return None
    try:
        if re.match(r"https?://", url):
            os.makedirs(cache, exist_ok=True)
            cp = os.path.join(cache, hashlib.sha1(url.encode()).hexdigest())
            if not os.path.exists(cp):
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                data = urllib.request.urlopen(req, timeout=12).read(8_000_000)
                open(cp, "wb").write(data)
            im = Image.open(cp)
        else:
            p = os.path.join(root, url.lstrip("/"))
            if not os.path.exists(p):
                return None
            im = Image.open(p)
        return im.convert("RGB")
    except Exception:
        return None


def _wrap(draw, text, font, maxw, maxlines):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > maxlines:
        lines = lines[:maxlines]
        while draw.textlength(lines[-1] + "…", font=font) > maxw and len(lines[-1]) > 1:
            lines[-1] = lines[-1][:-1]
        lines[-1] = lines[-1].rstrip() + "…"
    return lines


def card(e, root, cache, meta_line):
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    title = e.get("title") or "GoWithDME"
    poster = _poster(Image, e.get("poster_url"), root, cache)
    # latar: poster diburamkan memenuhi kartu, atau gradasi merek bila tak ada poster
    if poster:
        bg = poster.copy()
        r = max(W / bg.width, H / bg.height)
        bg = bg.resize((int(bg.width * r) + 1, int(bg.height * r) + 1))
        bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
        bg = bg.filter(ImageFilter.GaussianBlur(28))
    else:
        bg = Image.new("RGB", (W, H), BRAND)
        px = bg.load()
        for y in range(H):
            t = y / H
            for x in range(0, W):
                k = (x / W * 0.6 + t * 0.4)
                px[x, y] = tuple(int(BRAND[i] * (1 - k) + (ACCENT[i] * 0.55 + 20) * k) for i in range(3))
    shade = Image.new("RGB", (W, H), (8, 20, 16))
    bg = Image.blend(bg, shade, 0.55)
    d = ImageDraw.Draw(bg)
    f_t = _font(ImageFont, root, FONT_BOLD, 54)
    f_m = _font(ImageFont, root, FONT_REG, 28)
    f_b = _font(ImageFont, root, FONT_BOLD, 26)
    pad = 56
    tx = pad
    if poster:
        # poster utuh (tidak dipotong) di kiri, dalam bingkai membulat
        box_w, box_h = 400, H - 2 * pad
        p = poster.copy()
        p.thumbnail((box_w, box_h))
        mask = Image.new("L", p.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, p.width - 1, p.height - 1), 22, fill=255)
        px0, py0 = pad, (H - p.height) // 2
        bg.paste(p, (px0, py0), mask)
        tx = pad + p.width + 48
    maxw = W - tx - pad
    lines = _wrap(d, title, f_t, maxw, 4)
    lh = 66
    block = len(lines) * lh + 20 + 40
    y = max(pad + 50, (H - block) // 2)
    for ln in lines:
        d.text((tx, y), ln, font=f_t, fill=(255, 255, 255))
        y += lh
    y += 16
    for ln in _wrap(d, meta_line, f_m, maxw, 2):
        d.text((tx, y), ln, font=f_m, fill=(214, 228, 222))
        y += 38
    # penanda merek di bawah
    d.rounded_rectangle((tx, H - pad - 44, tx + 214, H - pad), 22, fill=ACCENT)
    d.text((tx + 22, H - pad - 38), "GoWithDME", font=f_b, fill=(255, 255, 255))
    return bg


def build(events, root, meta_for):
    """events: daftar dict event. meta_for(e) -> teks tanggal/kota. Mengembalikan set slug yang berhasil dibuat."""
    try:
        import PIL  # noqa: F401
    except ImportError:
        print("gen_og: Pillow tidak terpasang, kartu pratinjau dilewati (pip install pillow)")
        return set()
    out_dir = os.path.join(root, "og")
    if os.environ.get("GWM_SKIP_OG"):  # uji lokal tanpa internet: pakai kartu yang sudah ada, jangan hapus/unduh ulang
        return {f[:-4] for f in os.listdir(out_dir) if f.endswith(".jpg")} if os.path.isdir(out_dir) else set()
    cache = os.path.join(root, "tools", ".og-cache")
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith(".jpg"):
            os.remove(os.path.join(out_dir, f))
    ok = set()
    for e in events:
        try:
            im = card(e, root, cache, meta_for(e))
            im.save(os.path.join(out_dir, e["slug"] + ".jpg"), "JPEG", quality=84, optimize=True, progressive=True)
            ok.add(e["slug"])
        except Exception as ex:  # satu event gagal tidak boleh menggagalkan build
            print("gen_og: lewati", e.get("slug"), ex)
    print(f"gen_og: {len(ok)}/{len(events)} kartu di /og")
    return ok
