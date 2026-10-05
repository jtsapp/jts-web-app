"""
Нарезка задачника PrepPros «Advanced Digital SAT Math — 150 Hard Questions»
на вопросы-картинки для раздела SAT Math (src/screens/SatMathPage.jsx).

Почему картинки, а не текст: формулы в PDF набраны Cambria Math со своей
кодировкой, текстовый слой отдаёт вместо дробей мусор («!" #»), а в условиях
ещё таблицы и графики. Вопрос целиком — честный кадр без перенабора.

Почему Python, а не Node, как остальные экстракторы: текст тут векторный, его
нужно отрисовать, а рендерера PDF в зависимостях приложения нет. PyMuPDF
(`pip install pymupdf pillow`) рисует и отдаёт геометрию строк одним пакетом.

Раскладка (решение 05.10.2026): 6 юнитов по 22 вопроса подряд по номерам,
вопросы 133–150 в раздел не идут.

    python scripts/extract-sat-math.py <book.pdf> [--debug <dir>]

Пишет public/sat/math-advanced/units.json и qNNN.webp. С --debug ещё
страницы с рамками нарезки — границы вопросов проверять глазами по ним.
"""

import argparse
import json
import os
import re
import sys

import fitz  # PyMuPDF
from PIL import Image, ImageDraw

UNITS, PER_UNIT = 6, 22
TAKE = UNITS * PER_UNIT
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'sat', 'math-advanced')

# Вопросы стоят на страницах 3–23 в две колонки, ключ ответов — на 24–25.
Q_PAGES = range(2, 23)
KEY_PAGES = (23, 24)
SPLIT_X = 300  # граница колонок, pt
COLS = ((52, SPLIT_X), (SPLIT_X + 2, 566))
# Кадр шире колонки: строки левой доходят до 308 pt, а правая начинается с
# 306 — по SPLIT_X резались концы строк. Что залезло из соседней колонки,
# закрашивается белым (mask_neighbours). Ширина у обеих одна, 260 pt, — тогда
# кегль на всех картинках одинаковый.
CROPS = ((50, 310), (302, 562))
BODY_TOP, BODY_BOTTOM = 60, 742  # выше и ниже — колонтитулы канала
ZOOM = 3  # 216 dpi: формулы со степенями читаются и на ретине
PAD = 6
# На стр. 8 чья-то пометка маркером (аннотация Highlight поверх вопроса 39):
# рисуем без аннотаций — annots=False в get_pixmap.

# Дроби в ключе набраны той же Cambria Math и в текстовом слое теряются —
# сняты с отрисованной страницы глазами. Остальное (буквы, целые, десятичные)
# текстовый слой отдаёт чисто.
KEY_FRACTIONS = {
    1: ['91/4', '22.75'], 11: ['95/97'], 16: ['-28/3', '-9.333'],
    26: ['23/40', '0.575'], 45: ['19/24', '0.792'], 53: ['81/4', '20.25'],
    56: ['1/77'], 60: ['13/84', '0.155'],
    # В ключе книги «27/16, 1.686» — опечатка: 27/16 = 1.6875 (4x − 5 = 7/4).
    62: ['27/16', '1.6875'],
    71: ['29/4', '7.25'], 76: ['1/4', '0.25'], 94: ['27/21', '1.286'],
    101: ['35', '36', '37'], 141: ['10/3', '3.333'],
}


def read_key(doc):
    text = '\n'.join(doc[i].get_text() for i in KEY_PAGES)
    raw = {}
    for m in re.finditer(r'(?m)^\s*(\d{1,3})\.\s*(.*)$', text):
        raw.setdefault(int(m.group(1)), m.group(2).strip())
    key = {}
    for n in range(1, 151):
        if n in KEY_FRACTIONS:
            key[n] = ('spr', KEY_FRACTIONS[n])
            continue
        v = raw[n].replace('−', '-').replace(',', '').strip()
        if re.fullmatch(r'[ABCD]', v):
            key[n] = ('mcq', v)
        elif re.fullmatch(r'-?\d+(\.\d+)?', v):
            key[n] = ('spr', [v])
        else:
            sys.exit(f'ключ: не разобран ответ {n}: {raw[n]!r}')
    return key


def page_elements(page):
    """Строки текста и векторная графика страницы: (x0, y0, x1, y1, text)."""
    out = []
    for b in page.get_text('dict')['blocks']:
        if b['type'] != 0:
            x0, y0, x1, y1 = b['bbox']
            out.append((x0, y0, x1, y1, ''))
            continue
        for line in b['lines']:
            # Водяной знак канала — повёрнутая строка кеглем 100: не контент.
            if line['dir'] != (1.0, 0.0) or any(s['size'] > 40 for s in line['spans']):
                continue
            text = ''.join(s['text'] for s in line['spans'])
            if not text.strip():
                continue
            x0, y0, x1, y1 = line['bbox']
            out.append((x0, y0, x1, y1, text))
    for d in page.get_drawings():
        r = d['rect']
        out.append((r.x0, r.y0, r.x1, r.y1, ''))
    return [e for e in out if BODY_TOP <= e[1] and e[3] <= BODY_BOTTOM]


def column_of(e):
    cx = (e[0] + e[2]) / 2
    return 0 if cx < SPLIT_X else 1


def find_regions(doc, key):
    """Номер вопроса → (страница, колонка, y0, y1) в pt."""
    regions = {}
    for pi in Q_PAGES:
        els = page_elements(doc[pi])
        for col, (cx0, _) in enumerate(COLS):
            col_els = sorted((e for e in els if column_of(e) == col), key=lambda e: e[1])
            starts = []
            for e in col_els:
                m = re.match(r'\s*(\d{1,3})\.\s', e[4] + ' ')
                if m and e[0] < cx0 + 30 and 1 <= int(m.group(1)) <= 150:
                    starts.append((int(m.group(1)), e))
            for i, (n, e) in enumerate(starts):
                top = e[1]
                nxt = starts[i + 1][1] if i + 1 < len(starts) else None
                bottom_limit = nxt[1] if nxt else BODY_BOTTOM
                body = [x for x in col_els if top - 0.5 <= x[1] < bottom_limit]
                if nxt:
                    body = trim_preamble(body, key[n][0], nxt)
                y0 = min(x[1] for x in body)
                y1 = max(x[3] for x in body)
                regions[n] = (pi, col, y0, y1)
            # Условие следующего вопроса иногда стоит НАД его номером
            # (система уравнений, график) — его отрезала trim_preamble у
            # предыдущего, а здесь подбираем обратно.
            for i, (n, e) in enumerate(starts):
                pi_, c_, y0, y1 = regions[n]
                prev_bottom = regions[starts[i - 1][0]][3] if i else BODY_TOP - 1
                pre = [x for x in col_els if prev_bottom < x[1] and x[3] <= e[1] + 0.5]
                if pre:
                    regions[n] = (pi_, c_, min(y0, min(x[1] for x in pre)), y1)
    return regions


def trim_preamble(body, fmt, nxt):
    """Отрезает от вопроса хвост, который на деле — шапка следующего.

    У вопроса с вариантами конец известен точно: строка «D)». У вопроса с
    вводом ответа конца нет, и шапку следующего узнаём по самому большому
    просвету перед его номером.
    """
    if fmt == 'mcq':
        d_lines = [x for x in body if re.match(r'\s*D\)', x[4])]
        if d_lines:
            end = max(x[3] for x in d_lines)
            # Длинный вариант D переносится на вторую строку, а дробь в нём
            # набрана строками ниже «D)» — тянем конец по всему, что идёт
            # вплотную (межстрочный просвет тут 0–2 pt, до соседа — от 10).
            for x in sorted(body, key=lambda x: x[1]):
                if x[1] <= end + 4:
                    end = max(end, x[3])
            return [x for x in body if x[1] < end]
        return body
    ys = sorted(body, key=lambda x: x[1])
    best_gap, cut = 0, None
    bottom = ys[0][3]
    for x in ys[1:]:
        gap = x[1] - bottom
        if gap > best_gap:
            best_gap, cut = gap, x[1]
        bottom = max(bottom, x[3])
    gap_to_next = nxt[1] - bottom
    if cut is None or gap_to_next >= best_gap:
        return body
    return [x for x in ys if x[1] < cut]


def mask_neighbours(img, clip, col, els):
    dr = ImageDraw.Draw(img)
    for e in els:
        if column_of(e) == col or e[3] < clip.y0 or e[1] > clip.y1:
            continue
        x0, x1 = max(e[0], clip.x0), min(e[2], clip.x1)
        if x0 >= x1:
            continue
        dr.rectangle([(x0 - clip.x0) * ZOOM, (max(e[1], clip.y0) - clip.y0) * ZOOM,
                      (x1 - clip.x0) * ZOOM, (min(e[3], clip.y1) - clip.y0) * ZOOM], fill='white')


def render(doc, regions, key, debug_dir):
    os.makedirs(OUT_DIR, exist_ok=True)
    sizes = {}
    els_of = {}
    for n in range(1, TAKE + 1):
        pi, col, y0, y1 = regions[n]
        cx0, cx1 = CROPS[col]
        clip = fitz.Rect(cx0, y0 - PAD, cx1, y1 + PAD)
        pix = doc[pi].get_pixmap(matrix=fitz.Matrix(ZOOM, ZOOM), clip=clip, alpha=False, annots=False)
        img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        if pi not in els_of:
            els_of[pi] = page_elements(doc[pi])
        mask_neighbours(img, clip, col, els_of[pi])
        img.save(os.path.join(OUT_DIR, f'q{n:03d}.webp'), 'WEBP', quality=88, method=6)
        sizes[n] = (pix.width, pix.height)
    if debug_dir:
        os.makedirs(debug_dir, exist_ok=True)
        for pi in Q_PAGES:
            pix = doc[pi].get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False, annots=False)
            img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            dr = ImageDraw.Draw(img)
            for n, (p, col, y0, y1) in regions.items():
                if p != pi:
                    continue
                cx0, cx1 = CROPS[col]
                color = (220, 30, 30) if n % 2 else (30, 90, 220)
                if n > TAKE:
                    color = (150, 150, 150)
                dr.rectangle([cx0 * 1.4, (y0 - PAD) * 1.4, cx1 * 1.4, (y1 + PAD) * 1.4], outline=color, width=3)
                dr.text((cx1 * 1.4 - 40, (y0 - PAD) * 1.4 + 4), f'{n}', fill=color)
            img.save(os.path.join(debug_dir, f'page{pi + 1:02d}.png'))
    return sizes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--debug')
    args = ap.parse_args()

    doc = fitz.open(args.pdf)
    key = read_key(doc)
    regions = find_regions(doc, key)
    missing = [n for n in range(1, 151) if n not in regions]
    if missing:
        sys.exit(f'не найдены вопросы: {missing}')
    sizes = render(doc, regions, key, args.debug)

    units = []
    for u in range(UNITS):
        qs = []
        for n in range(u * PER_UNIT + 1, (u + 1) * PER_UNIT + 1):
            fmt, ans = key[n]
            w, h = sizes[n]
            qs.append({'id': f'q{n:03d}', 'number': n, 'format': fmt, 'image': f'q{n:03d}.webp',
                       'width': w, 'height': h, 'answer': ans})
        units.append({'id': f'u{u + 1}', 'index': u + 1, 'range': [qs[0]['number'], qs[-1]['number']],
                      'questions': qs})
    data = {
        'source': {
            'book': 'PrepPros — Advanced Digital SAT Math: 150 Hard Questions For Students Aiming For 800',
            'edition': '1st, 2024',
        },
        'unitSize': PER_UNIT,
        'excluded': list(range(TAKE + 1, 151)),
        'units': units,
    }
    with open(os.path.join(OUT_DIR, 'units.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{TAKE} вопросов → {os.path.normpath(OUT_DIR)}')


if __name__ == '__main__':
    main()
