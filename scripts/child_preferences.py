"""Reproducible fictional preferences; retain the eight curated demo profiles."""
from collections import Counter
from random import Random

COLORS = ['Xanh dương', 'Đỏ', 'Vàng', 'Xanh lá', 'Cam', 'Tím', 'Xanh da trời',
          'Hồng', 'Xanh ngọc', 'Trắng', 'Đỏ đô', 'Tím nhạt', 'Vàng chanh',
          'Hồng đào', 'Xanh bạc hà', 'Xanh navy']
TOYS = {
    'gach_lego': ['Bộ lắp ghép trạm cứu hỏa', 'Bộ lắp ghép tàu hỏa',
                 'Bộ lắp ghép tàu vũ trụ', 'Bộ lắp ghép thành phố',
                 'Bộ lắp ghép xe đua', 'Bộ lắp ghép robot',
                 'Bộ lắp ghép công viên', 'Bộ lắp ghép khủng long',
                 'Bộ lắp ghép nông trại', 'Bộ lắp ghép xe công trình',
                 'Bộ lắp ghép tiệm bánh', 'Bộ lắp ghép ngôi nhà trên cây'],
    'bup_be': ['Thú bông thỏ', 'Thú bông mèo', 'Thú bông gấu trúc',
               'Thú bông khủng long', 'Thú bông chó', 'Thú bông chim cánh cụt',
               'Búp bê bác sĩ', 'Búp bê phi hành gia', 'Búp bê đầu bếp',
               'Bộ nhà búp bê', 'Búp bê nàng tiên', 'Bộ chăm sóc búp bê'],
    'board_game': ['Bộ cờ cá ngựa', 'Bộ cờ vua', 'Bộ cờ đam',
                   'Bộ cờ rắn leo thang', 'Bộ domino hình ảnh',
                   'Bộ thẻ ghi nhớ động vật', 'Bộ xếp tháp gỗ',
                   'Bộ rút gỗ cân bằng', 'Bộ cờ ludo',
                   'Bộ trò chơi tìm kho báu', 'Bộ thẻ ghép cặp',
                   'Bộ trò chơi mê cung'],
    'canh_dieu': ['Diều bướm', 'Diều đại bàng', 'Diều cá mập',
                 'Diều cầu vồng', 'Diều bạch tuộc', 'Diều rồng',
                 'Bóng đá mini', 'Bộ cầu lông thiếu nhi', 'Đĩa bay mềm',
                 'Bộ ném vòng', 'Bộ bowling ngoài trời', 'Dây nhảy nhiều màu'],
}
PRESCHOOL = {
    'gach_lego': ['Bộ xếp hình khối lớn nông trại', 'Bộ xếp hình khối lớn xe buýt',
                 'Bộ xếp hình khối lớn sở thú', 'Bộ xếp hình khối lớn ngôi nhà',
                 'Bộ xếp hình khối lớn tàu hỏa', 'Bộ xếp hình khối lớn vườn hoa',
                 'Bộ xếp hình khối lớn xe cứu hỏa', 'Bộ xếp hình khối lớn cầu vồng'],
    'board_game': ['Bộ domino hình trái cây', 'Bộ thẻ ghép cặp động vật',
                   'Bộ thẻ ghi nhớ màu sắc', 'Bộ ghép hình phương tiện',
                   'Bộ ghép hình đại dương', 'Bộ ghép hình nông trại',
                   'Bộ phân loại hình khối', 'Bộ trò chơi tìm hình giống nhau'],
}


def fill_preferences(children):
    rng = Random(42)
    color_counts = Counter(c['favoriteColor'] for c in children if c.get('favoriteColor'))
    toy_counts = Counter(c['favoriteToy'] for c in children if c.get('favoriteToy'))
    pairs = Counter((c['favoriteColor'], c['favoriteToy']) for c in children
                    if c.get('favoriteColor') and c.get('favoriteToy'))
    for child in sorted(children, key=lambda c: c['id']):
        color, toy = child.get('favoriteColor'), child.get('favoriteToy')
        if color and toy:
            continue
        if not color:
            color = rng.choice([c for c in COLORS if color_counts[c] == min(color_counts[x] for x in COLORS)])
            child['favoriteColor'] = color
            color_counts[color] += 1
        if not toy:
            theme = child['theme']
            pool = PRESCHOOL.get(theme, TOYS[theme]) if child['ageBand'] in ['0–2 tuổi', '3–5 tuổi'] else TOYS[theme]
            available = [t for t in pool if not pairs[(color, t)]]
            assert available, f'Not enough distinct preferences for {child["id"]}'
            toy = rng.choice([t for t in available if toy_counts[t] == min(toy_counts[x] for x in available)])
            child['favoriteToy'] = toy
            toy_counts[toy] += 1
        pairs[(color, toy)] += 1
    validate_preferences(children)


def validate_preferences(children):
    assert all(c.get('favoriteColor', '').strip() and c.get('favoriteToy', '').strip() for c in children)
    colors = Counter(c['favoriteColor'] for c in children)
    toys = Counter(c['favoriteToy'] for c in children)
    pairs = Counter((c['favoriteColor'], c['favoriteToy']) for c in children)
    assert max(pairs.values()) == 1, 'Repeated color/toy pair'
    assert max(toys.values()) <= 3, 'One toy occurs too often'
    assert max(colors.values()) - min(colors.values()) <= 1, 'Unbalanced colors'
    return {'children': len(children), 'colors': len(colors), 'toys': len(toys),
            'max_children_per_toy': max(toys.values()), 'distinct_pairs': len(pairs)}


if __name__ == '__main__':
    import json
    from pathlib import Path
    path = Path(__file__).resolve().parents[1] / 'public/mock/mykingdom_campaign_mock_400.json'
    print(json.dumps(validate_preferences(json.loads(path.read_text())['crm']['children']), ensure_ascii=False))
