#!/usr/bin/env python3
"""Independent assertions for the JSON on disk; fails with nonzero exit status."""
import json, sys, re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path

DEFAULT=Path(__file__).resolve().parents[1]/'public/mock/mykingdom_campaign_mock_400.json'

def validate(d):
    checks=0
    def check(condition,message):
        nonlocal checks
        checks+=1
        if not condition:raise AssertionError(message)
    def dt(value):return datetime.fromisoformat(value)
    def unique(rows,key):
        ids=[x[key] for x in rows];check(len(ids)==len(set(ids)),f'Duplicate {key}')
    customers=d['customers'];events=d['events'];stories=d['stories'];orders=d['orders'];sessions=d['sessions']
    check(d['metadata']['is_mock'] is True and d['metadata']['seed']==42,'Missing dataset provenance')
    check(len(customers)==400,'Expected exactly 400 customers')
    for rows,key in [(customers,'visitor_id'),(events,'event_id'),(stories,'story_id'),(sessions,'session_id'),(orders,'order_id'),(d['products'],'product_id'),(d['followups'],'message_id')]:unique(rows,key)
    check(len({c['display_nickname'] for c in customers})==400,'Nicknames must be unique')
    check(Counter(c['source'] for c in customers)=={'facebook':180,'tiktok':120,'youtube':40,'zalo':40,'direct':20},'First-touch source allocation')
    check(Counter(c['device'] for c in customers)=={'mobile':320,'desktop':80},'Device allocation')
    expected_cross={('facebook','mobile'):144,('facebook','desktop'):36,('tiktok','mobile'):96,('tiktok','desktop'):24,('youtube','mobile'):32,('youtube','desktop'):8,('zalo','mobile'):32,('zalo','desktop'):8,('direct','mobile'):16,('direct','desktop'):4}
    check(Counter((c['source'],c['device']) for c in customers)==expected_cross,'Cross source/device allocation')
    check(Counter(c['acquisition_week'] for c in customers)==dict(enumerate([32,40,48,60,72,60,48,40],1)),'Weekly allocation')
    check(sum(19<=dt(c['first_visit']).hour<23 for c in customers)==260,'Peak-hour first visits')
    check(Counter(c['theme_id'] for c in customers)=={'gach_lego':91,'bup_be':65,'board_game':52,'canh_dieu':52,None:140},'Theme allocation')
    check(sum(c['contact_info'] is not None for c in customers)==65,'Contact cohort')
    check(Counter(c['contact_type'] for c in customers if c['contact_info'])=={'zalo':40,'email':15,'both':10},'Contact channel allocation')
    for c in customers:
        info=c['contact_info']
        check(bool(c['user_id'])==bool(info),'User ID only for identified contacts')
        if info:
            check(info['is_mock'] and info['contact_valid'],'Contact provenance')
            check(not info['email'] or info['email'].endswith('@example.com'),'Unsafe email')
            check(not info['phone'] or info['phone'].startswith('09xx-xxx-'),'Unsafe phone')
    bycustomer={c['visitor_id']:c for c in customers};bysession={s['session_id']:s for s in sessions};byevent={e['event_id']:e for e in events}
    grouped=defaultdict(list);selected=defaultdict(set)
    cutoff=dt(d['metadata']['reporting_as_of'])
    check(events==sorted(events,key=lambda e:(e['timestamp'],e['event_id'])),'Events must be chronological')
    for e in events:
        check(e['visitor_id'] in bycustomer,'Unknown visitor reference')
        check(dt(e['timestamp']).utcoffset()==timedelta(hours=7),'Timestamp must have +07:00 offset')
        check('2026-11-02'<=e['timestamp'][:10]<='2026-12-27','Event outside campaign')
        check(dt(e['timestamp'])<cutoff,'Event after report cutoff')
        c=bycustomer[e['visitor_id']]
        expected_uid=c['user_id'] if c['contact_at'] and dt(e['timestamp'])>=dt(c['contact_at']) else None
        check(e['user_id']==expected_uid,'Point-in-time user identity')
        expected_group=c['ab_group'] if c['stage_timestamps']['lead'] and dt(e['timestamp'])>=dt(c['stage_timestamps']['lead']) else None
        check(e['ab_group']==expected_group,'Point-in-time A/B group')
        if e['session_id']:
            check(e['session_id'] in bysession,'Unknown session reference')
            s=bysession[e['session_id']]
            check(s['visitor_id']==e['visitor_id'],'Session owner mismatch')
            check(dt(s['start_at'])<=dt(e['timestamp'])<=dt(s['end_at']),'Event outside session')
        grouped[e['visitor_id']].append(e);selected[e['event_name']].add(e['visitor_id'])
    for s in sessions:
        check(s['visitor_id'] in bycustomer,'Unknown session customer')
        check(dt(s['start_at'])<=dt(s['end_at'])<=cutoff,'Invalid session interval')
    for name,n in [('landing_page_view',400),('memory_theme_select',260),('story_form_start',130),('story_submit_success',98),('memory_card_create_success',93),('memory_card_create_fail',9),('memory_card_retry',6),('marketing_consent_granted',46),('marketing_consent_withdrawn',4),('ugc_submission',30)]:check(len(selected[name])==n,f'Unique customer count for {name}')
    inferred=Counter();ever=Counter();ab=defaultdict(Counter);sql_buyers=set();lead_people=set();outside=set()
    shown={};confirmed=set();consent_by_source=Counter();delivery_counts=Counter()
    for visitor,rows in grouped.items():
        contact=False;consent=False;lead=mql=sql=None;buyer=None;delivery_times=[];contacts=set();group=None
        for e in rows:
            name=e['event_name'];time=dt(e['timestamp'])
            if name=='contact_info_submitted':contact=True;contacts.add(e['contact_type'])
            if name=='marketing_consent_shown':
                check(e['consent_impression_id'] not in shown,'Duplicate consent impression');shown[e['consent_impression_id']]=e
            if name=='marketing_consent_granted':
                impression=shown.get(e['consent_impression_id']);check(impression is not None,'Consent without visible prompt')
                check(impression['visitor_id']==visitor and impression['consent_source']==e['consent_source'],'Consent impression owner/source')
                check(dt(impression['timestamp'])<time,'Consent before impression')
                check(e['consent_impression_id'] not in confirmed,'Duplicate consent confirmation')
                confirmed.add(e['consent_impression_id']);consent=True;consent_by_source[e['consent_source']]+=1
            if name=='marketing_consent_withdrawn':check(consent,'Withdrawal without prior consent');consent=False
            if contact and consent and lead is None:lead=time;group=e['ab_group'];lead_people.add(visitor)
            if lead and name in ['followup_click','product_collection_view'] and mql is None:mql=time
            if mql and name in ['add_to_cart','consult_request'] and sql is None:sql=time
            if name=='followup_delivered':
                check(contact and consent,'Delivery without valid contact/consent')
                check(e['channel']==('zalo' if 'zalo' in contacts else 'email'),'Wrong priority channel')
                check(sum(t.date()==time.date() for t in delivery_times)<1,'Daily send cap')
                check(sum(t>time-timedelta(days=7) for t in delivery_times)<3,'Rolling seven-day cap')
                delivery_times.append(time);delivery_counts[group]+=1
            if name in ['followup_open','followup_click']:
                check(any(x['event_name']=='followup_delivered' and x['message_id']==e['message_id'] and dt(x['timestamp'])<time for x in rows),'Open/click before delivery')
            if name in ['purchase','voucher_redeem']:
                buyer=time
                if sql and sql<time:sql_buyers.add(visitor)
                if not lead:outside.add(visitor)
        c=bycustomer[visitor]
        stage='Customer' if buyer else 'SQL' if sql else 'MQL' if mql else 'Lead' if lead else 'Khách ẩn danh'
        inferred[stage]+=1
        check(c['funnel_stage']==stage,'Stored customer stage differs from events')
        check(c['entered_lead_funnel']==bool(lead),'Lead membership differs from events')
        for key,value in [('lead',lead),('mql',mql),('sql',sql),('customer',buyer)]:
            check(c['stage_timestamps'][key]==(value.isoformat(timespec='seconds') if value else None),f'Incorrect {key} timestamp')
            if value:ever[key]+=1
        if lead:
            ab[group]['lead']+=1
            if mql:ab[group]['mql']+=1
            if sql:ab[group]['sql']+=1
            if visitor in sql_buyers:ab[group]['sql_customer']+=1
        expected_consent='withdrawn' if visitor in selected['marketing_consent_withdrawn'] else 'granted' if visitor in selected['marketing_consent_granted'] else None
        if expected_consent:check(c['marketing_consent_status']==expected_consent,'Final consent state')
    check(inferred=={'Khách ẩn danh':348,'Lead':21,'MQL':11,'SQL':6,'Customer':14},'Final funnel partition')
    check(ever=={'lead':46,'mql':25,'sql':14,'customer':14},'Cumulative funnel')
    check(ab['A']=={'lead':23,'mql':12,'sql':6,'sql_customer':3},'Group A funnel')
    check(ab['B']=={'lead':23,'mql':13,'sql':8,'sql_customer':5},'Group B funnel')
    check(len(sql_buyers)==8 and len(outside)==6,'SQL customers vs outside funnel')
    check(consent_by_source=={'create':32,'share':9,'connect':5},'Consent point allocation')
    check(delivery_counts=={'A':23,'B':23},'A/B delivery counts')
    for group,clicks in [('A',2),('B',4)]:check(sum(e['event_name']=='followup_click' and e['ab_group']==group for e in events)==clicks,'A/B click counts')
    check(len(stories)==98 and len({s['story_text'] for s in stories})==98,'Story uniqueness')
    # Unique whole stories alone do not catch recycled paragraphs.
    sentences=Counter(' '.join(t.lower().split()) for story in stories
        for t in re.split(r'(?<=[.!?])\s+',story['story_text']) if len(t.split())>=8)
    check(not any(n>1 for n in sentences.values()),'Repeated story sentences')
    openings=[re.split(r'(?<=[.!?])\s+',story['story_text'])[0].strip().lower() for story in stories]
    check(len(set(openings))==len(openings),'Repeated story openings')
    text_lengths={story['story_id']:len(story['story_text']) for story in stories}
    for event in events:
        if event.get('story_id') in text_lengths and 'story_length' in event:
            check(event['story_length']==text_lengths[event['story_id']],'Story length event mismatch')
    check(Counter(s['card_status'] for s in stories)=={'success':93,'failed':5},'Final card outcomes')
    check(len([v for v in selected['memory_card_retry'] if v in selected['memory_card_create_success']])==4,'Recovered cards')
    ugc=[s for s in stories if s['submitted_to_community']]
    check(len(ugc)==30 and Counter(s['community_status'] for s in ugc)=={'pending':8,'approved':18,'hidden':4},'UGC status allocation')
    check(sum(s['featured'] for s in stories)==6,'Featured count')
    for s in stories:
        check(s['visitor_id'] in bycustomer and s['session_id'] in bysession,'Invalid story owner/session')
        check(40<=len(s['story_text'].split())<=120,'Story word count')
        year=int(s['period_year'])
        expected_era='80s' if year<1990 else '90s' if year<2000 else '00s' if year<2010 else '10s'
        check(s['era_category']==expected_era,'Story year/era mismatch')
        check(not s['featured'] or (s['ugc_usage_consent'] and s['community_status']=='approved'),'Featuring without permission/approval')
        check(not s['submitted_to_community'] or (s['ugc_usage_consent'] and s['card_status']=='success'),'UGC without permission/card')
    products={p['product_id']:p for p in d['products']};vouchers={v['code']:v for v in d['vouchers']}
    check(len(orders)==14 and len({o['visitor_id'] for o in orders})==14,'Orders/unique buyers')
    check(Counter(o['channel'] for o in orders)=={'online':10,'store':4},'Order channels')
    for o in orders:
        check(o['visitor_id'] in bycustomer,'Unknown buyer')
        subtotal=0
        for item in o['items']:
            check(item['product_id'] in products and item['quantity']>0,'Invalid order item')
            check(item['unit_price']==products[item['product_id']]['price'],'Product price mismatch')
            subtotal+=item['unit_price']*item['quantity']
        check(o['subtotal']==subtotal and o['order_value']==subtotal-o['discount_amount'],'Order arithmetic')
        check(250000<=o['order_value']<=1200000,'Order value bounds')
        matching=[e for e in events if e['event_name'] in ['purchase','voucher_redeem'] and e.get('order_id')==o['order_id']]
        check(len(matching)==1 and matching[0]['order_value']==o['order_value'] and matching[0]['visitor_id']==o['visitor_id'],'Transaction event mismatch')
        check(o['campaign_attributed'],'Missing campaign attribution')
        if o['voucher_code']:
            v=vouchers[o['voucher_code']];check(dt(o['order_date'])<=dt(v['expires_at']),'Expired voucher')
            check(o['discount_amount']==subtotal*v['discount_percent']//100,'Voucher discount arithmetic')
        else:
            click=byevent[o['attribution']['click_event_id']]
            valid=[e for e in grouped[o['visitor_id']] if e['event_name']=='campaign_link_click' and timedelta(0)<=dt(o['order_date'])-dt(e['timestamp'])<=timedelta(days=7)]
            check(click==max(valid,key=lambda e:e['timestamp']),'Attribution must use latest valid click')
            check(o['attributed_source']==click['utm_source'],'Attributed source mismatch')
        if o['channel']=='store':check(bool(o['store_id'] and o['voucher_code']) and matching[0]['event_name']=='voucher_redeem','Offline attribution')
        else:check(any(e['event_name']=='add_to_cart' and dt(e['timestamp'])<dt(o['order_date']) for e in grouped[o['visitor_id']]),'Online purchase without preceding cart')
    for code,v in vouchers.items():check(v['redemptions']==sum(o['voucher_code']==code for o in orders)<=v['limit'],'Voucher redemption count')
    for h in d['sales_handoffs']:
        check(h['visitor_id'] in bycustomer and dt(h['handed_off_at'])-dt(h['sql_at'])>=timedelta(hours=24),'Invalid handoff timing')
        check(not any(e['event_name'] in ['purchase','voucher_redeem'] and dt(e['timestamp'])<dt(h['handed_off_at']) for e in grouped[h['visitor_id']]),'Already purchased before handoff')
    for f in d['followups']:
        rows=grouped[f['visitor_id']]
        if f['status']=='delivered':check(sum(e['event_name']=='followup_delivered' and e['message_id']==f['message_id'] for e in rows)==1,'Followup ledger mismatch')
        else:check(f['delivered_at'] is None and not any(e['event_name']=='followup_delivered' and e['message_id']==f['message_id'] for e in rows),'Blocked delivery')
    costs=Counter()
    for row in d['campaign_costs']:check(row['amount']>=0 and row['channel']!='direct','Invalid cost');costs[row['cost_type']]+=row['amount']
    check(costs=={'quang_cao':2400000,'noi_dung':800000},'Budget mismatch')
    for row in d['content_metrics']:
        check(0<=row['reach']<=row['impressions'] and 0<=row['video_completed']<=row['video_starts']<=row['impressions'],'Platform metric bounds')
        count=sum(1 for e in events if e['event_name']=='campaign_link_click' and e.get('content_id')==row['content_id'] and (dt(e['timestamp']).date()-datetime(2026,11,2).date()).days//7+1==row['week'])
        check(count==row['link_clicks'],'Content click metric mismatch')
    crm=d.get('crm')
    if crm:
        families={f['id']:f for f in crm['families']};children={c['id']:c for c in crm['children']}
        check(len(families)==len(crm['families']) and len(children)==len(crm['children']),'Duplicate CRM IDs')
        visitor_ids={c['visitor_id'] for c in customers}
        for f in families.values():check(f['visitorId'] in visitor_ids,'Unknown family visitor')
        for c in children.values():
            check(c['familyId'] in families and c['budget']>=0,'Invalid child family/budget')
            check(not c['birthdayOptIn'] or bool(c['birthday']),'Birthday permission without birthday')
        for c in crm['consultations']+crm['history']:
            check(c['familyId'] in families and c['childId'] in children,'Invalid consultation/history reference')
            check(children[c['childId']]['familyId']==c['familyId'],'Cross-family consultation/history')
        order_map={o['order_id']:o for o in orders}
        for oid,cid in crm['orderLinks'].items():
            check(oid in order_map and cid in children,'Unknown order/child')
            check(families[children[cid]['familyId']]['visitorId']==order_map[oid]['visitor_id'],'Cross-family order link')
    revenue=sum(o['order_value'] for o in orders);aov=revenue/len(orders)
    check(450000*.85<=aov<=450000*1.15,'AOV target')
    consent_report={source:{'shown':sum(e['consent_source']==source for e in shown.values()),'granted':consent_by_source[source]} for source in ['create','share','connect']}
    for stats in consent_report.values():stats['rate_percent']=round(stats['granted']/stats['shown']*100,4)
    return {'passed':True,'assertions':checks,'customers':400,'sessions':len(sessions),'events':len(events),'first_touch':dict(Counter(c['source'] for c in customers)),'devices':dict(Counter(c['device'] for c in customers)),'final_stages':dict(inferred),'cumulative_funnel':dict(ever),'sql_to_customer_percent':round(len(sql_buyers)/ever['sql']*100,4),'consent':consent_report,'stories':len(stories),'ugc_statuses':dict(Counter(s['community_status'] for s in ugc)),'orders':len(orders),'revenue':revenue,'aov':aov,'cac':sum(costs.values())/14,'roas':revenue/costs['quang_cao'],'ltv_revenue_assumption':aov*3,'followup_ctr_percent':{'A':2/23*100,'B':4/23*100}}

if __name__=='__main__':
    report=validate(json.loads(Path(sys.argv[1] if len(sys.argv)>1 else DEFAULT).read_text()))
    print(json.dumps(report,ensure_ascii=False,indent=2))
