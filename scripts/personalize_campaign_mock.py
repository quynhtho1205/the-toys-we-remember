"""Give the fixture unique display names and distinct Gallery cover images."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def personalize(data):
    surnames=['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Trịnh','Mai','Đào']
    names=['Minh Anh','Hoài An','Gia Hân','Bảo Ngọc','Tuấn Kiệt','Khánh Linh','Đức Minh','Thanh Vy','Nhật Nam','Thảo Nhi','Quỳnh Chi','Hải Đăng','Ngọc Hà','Anh Khoa','Phương Thảo','Bảo Trâm','Thiên Phúc','Khánh Duy','Yến Nhi','Quang Huy']
    mapping={c['visitor_id']:f'{surnames[i//20]} {names[i%20]}' for i,c in enumerate(data['customers'])}
    for customer in data['customers']:customer['display_nickname']=mapping[customer['visitor_id']]
    for story in data['stories']:story['nickname']=mapping[story['visitor_id']]
    for family in data.get('crm',{}).get('families',[]):
        if family.get('visitorId') in mapping:family['name']=mapping[family['visitorId']]
    # Story-specific AI illustrations; never derive an image from card position.
    illustrated_ids={'STORY006','STORY085','STORY019','STORY075','STORY028','STORY063','STORY047','STORY033','STORY015'}
    for story in data['stories']:
        if story['story_id'] in illustrated_ids:
            story['photo_url']=f"/mock/images/gallery/{story['story_id'].lower()}.webp"
    gallery=sorted((s for s in data['stories'] if s['community_status']=='approved' and s['ugc_usage_consent'] and s['submitted_to_community']),key=lambda s:(s['featured'],s['created_at']),reverse=True)
    assert len(set(mapping.values()))==400
    assert len({s['photo_url'] for s in gallery[:9]})==9
    # Editorial fixture copy is canonical. Keep legacy generator random draws intact
    # so story IDs, owners, themes and all campaign relationships remain reproducible.
    copy=json.loads((ROOT/'scripts/campaign_story_copy.json').read_text())
    assert set(copy)=={story['story_id'] for story in data['stories']}
    for story in data['stories']:
        entry=copy[story['story_id']]
        assert entry['theme_id']==story['theme_id'], 'Story/theme mapping changed'
        story['story_text']=entry['story_text']
        year=int(story['period_year'])
        story['era_category']='80s' if year<1990 else '90s' if year<2000 else '00s' if year<2010 else '10s'
    lengths={story['story_id']:len(story['story_text']) for story in data['stories']}
    for event in data['events']:
        if event.get('story_id') in lengths and 'story_length' in event:
            event['story_length']=lengths[event['story_id']]
    nicknames=json.loads((ROOT/'scripts/child_nicknames.json').read_text())
    children=data['crm']['children']
    assert len(nicknames)>=len(children) and len(set(nicknames))==len(nicknames)
    for child,name in zip(children,nicknames):
        child.setdefault('legacyNickname',child['nickname'])
        child['nickname']='Bé '+name
    # Fictional preferences for the Khánh Linh / Ngọc Hà demo families.
    preferences={
        'CHV0006-0': ('Xanh dương', 'Bộ lắp ghép lâu đài'),
        'CHV0006-1': ('Đỏ', 'Bộ lắp ghép xe cứu hỏa'),
        'CHV0013-0': ('Vàng', 'Thú bông gấu'),
        'CHV0046-0': ('Xanh lá', 'Bộ xếp hình động vật'),
        'CHV0046-1': ('Cam', 'Bộ xếp hình nhà cửa'),
        'CHV0226-0': ('Tím', 'Búp bê và phụ kiện'),
        'CHV0233-0': ('Xanh da trời', 'Diều cầu vồng'),
        'CHV0393-0': ('Vàng', 'Bộ cờ tỷ phú'),
    }
    for child in children:
        if child['id'] in preferences:
            child['favoriteColor'],child['favoriteToy']=preferences[child['id']]
    # Fifteen fictional Zalo requests, distinct from legacy/manual CRM records.
    from datetime import datetime, timedelta, timezone
    requests=json.loads((ROOT/'scripts/zalo_consultation_copy.json').read_text())
    assert len(requests)==15 and len({r['question'] for r in requests})==15
    crm=data['crm']
    crm['consultations']=[c for c in crm['consultations'] if not c['id'].startswith('ZALO_DEMO_')]
    for i,(family,entry) in enumerate(zip(crm['families'],requests)):
        child=next(c for c in crm['children'] if c['familyId']==family['id'])
        created=datetime(2026,12,26,9,0,tzinfo=timezone(timedelta(hours=7)))+timedelta(minutes=i*37)
        row=dict(entry,id=f'ZALO_DEMO_{i+1:02}',familyId=family['id'],childId=child['id'],createdAt=created.isoformat(),consultationConsentAt=(created-timedelta(seconds=15)).isoformat(),contactLabel=f'Zalo demo •••{8101+i}',origin='mock-zalo-v1')
        row.setdefault('owner','')
        if row['status']!='pending':row['acceptedAt']=(created+timedelta(minutes=8+i*3)).isoformat()
        crm['consultations'].append(row)
    data['metadata']['zalo_consultation_version']='v1'
    data['metadata']['story_copy_version']='editorial-v2'
    return data

if __name__=='__main__':
    path=ROOT/'public/mock/mykingdom_campaign_mock_400.json'
    data=personalize(json.loads(path.read_text()))
    from validate_campaign_mock import validate
    report=validate(data)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    (path.parent/'validation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
