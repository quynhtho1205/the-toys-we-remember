import { Injectable, computed, inject, signal } from '@angular/core';
import { MarTechService, TrackedEvent } from './martech-service';
import type { CampaignSettings, CampaignStory, CustomerNote, LocalRun, VoucherDraft } from './campaign-admin-store';
import { MemoryThemeId } from '../models/martech-events.model';

export interface MockCustomer {
 visitor_id:string;user_id:string|null;display_nickname:string;source:string;device:string;
 assigned_to:string|null;sales_note:string;first_visit:string;funnel_stage:string;
 contact_info?:{email:string|null;phone:string|null;contact_valid:boolean;is_mock:boolean}|null;
}
export interface FollowupRecord {
 message_id:string;visitor_id:string;channel:string|null;ab_group:string|null;status:string;
 body:string|null;triggered_at:string;delivered_at:string|null;opened_at:string|null;clicked_at:string|null;block_reason:string|null;
}
interface RawStory {
 story_id:string;card_id:string|null;visitor_id:string;session_id:string;nickname:string;period_year:string;era_category:string;
 story_text:string;theme_id:MemoryThemeId;photo_url:string|null;created_at:string;card_status:'success'|'failed';
 ugc_usage_consent:boolean;submitted_to_community:boolean;community_status:CampaignStory['status'];featured:boolean;
}
export interface MockDataset {
 crm?:import('./family-crm').CrmState;
 metadata:{schema_version:string;dataset_id:string;customer_count:number;is_mock:boolean;reporting_as_of:string};
 campaign:{name:string;start:string;end:string;daily_limit:number;weekly_limit:number;ab_enabled:boolean;template_a:string;template_b:string;ltv_total_purchases_12m:number;themes:{id:string;name:string;products:string[]}[]};
 customers:MockCustomer[];events:TrackedEvent[];stories:RawStory[];followups:FollowupRecord[];
 vouchers:{voucher_id:string;code:string;discount_percent:number;expires_at:string;limit:number;active:boolean}[];
 campaign_costs:{week:number;channel:string;cost_type:string;amount:number}[];
 content_metrics:{week:number;platform:string;content_id:string;impressions:number;reach:number;video_starts:number;video_completed:number;link_clicks:number}[];
 orders:unknown[];sessions:unknown[];products:unknown[];sales_handoffs:unknown[];
}
interface Changes {
 stories:Record<string,CampaignStory>;vouchers:Record<string,VoucherDraft>;notes:Record<string,CustomerNote>;
 runs:Record<string,LocalRun>;events:Record<string,TrackedEvent>;settings?:CampaignSettings;
}
const KEY='ttwr.mock400.v1.changes';
const emptyChanges=():Changes=>({stories:{},vouchers:{},notes:{},runs:{},events:{}});
@Injectable({providedIn:'root'})
export class AdminDataSource {
 private readonly live=inject(MarTechService);
 readonly unified=signal(false);
 readonly mode=signal<'mock'|'live'>('live');readonly dataset=signal<MockDataset|null>(null);
 readonly loading=signal(false);readonly error=signal('');readonly writeError=signal('');
 private readonly changes=signal<Changes>(this.readChanges());
 private clockLoadedAt=Date.now();private activated=false;
 readonly events=computed(()=>this.unified()?[...new Map([...(this.dataset()?.events||[]),...this.live.events(),...Object.values(this.changes().events)].map(e=>[e.event_id,e])).values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)):this.mode()==='live'?this.live.events():[...(this.dataset()?.events||[]),...Object.values(this.changes().events)].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)));
 readonly customers=computed(()=>{const base=this.mode()==='mock'?this.dataset()?.customers||[]:[];if(!this.unified())return base;const rows=new Map(base.map(c=>[c.visitor_id,c]));for(const e of this.events())if(!rows.has(e.visitor_id))rows.set(e.visitor_id,{visitor_id:e.visitor_id,user_id:e.user_id||null,display_nickname:String(e['nickname']||'Khách mới'),source:e.utm_source,device:e.device,assigned_to:null,sales_note:'',first_visit:e.timestamp,funnel_stage:'Khách mới'});return [...rows.values()];});
 readonly storyRecords=computed(()=>{
  const base:CampaignStory[]=(this.dataset()?.stories||[]).map(s=>({id:s.story_id,cardId:s.card_id||'',visitorId:s.visitor_id,sessionId:s.session_id,nickname:s.nickname,periodYear:s.period_year,eraCategory:s.era_category,storyText:s.story_text,theme_id:s.theme_id,photoUrl:s.photo_url,createdAt:s.created_at,ugcConsent:s.ugc_usage_consent,submitted:s.submitted_to_community,status:s.community_status,featured:s.featured,cardStatus:s.card_status}));
  return this.merge(base,this.changes().stories,s=>s.id);
 });
 readonly voucherRecords=computed(()=>this.merge((this.dataset()?.vouchers||[]).map(v=>({id:v.voucher_id,code:v.code,discount:v.discount_percent,expires:v.expires_at.slice(0,10),limit:v.limit,active:v.active})),this.changes().vouchers,v=>v.id));
 readonly noteRecords=computed(()=>this.merge((this.dataset()?.customers||[]).filter(c=>c.assigned_to||c.sales_note).map(c=>({visitorId:c.visitor_id,owner:c.assigned_to||'',note:c.sales_note,updatedAt:c.first_visit})),this.changes().notes,n=>n.visitorId));
 readonly runRecords=computed(()=>Object.values(this.changes().runs));
 readonly settingsRecord=computed(()=>{
  if(this.changes().settings)return this.changes().settings!;
  const c=this.dataset()?.campaign;if(!c)return null;
  return {name:c.name,start:c.start,end:c.end,dailyLimit:c.daily_limit,weeklyLimit:c.weekly_limit,abEnabled:c.ab_enabled,templateA:c.template_a,templateB:c.template_b,themes:c.themes.map(t=>({...t,products:t.products.join(', ')}))};
 });
 readonly storageError=computed(()=>this.mode()==='live'?this.live.storageError():!!this.writeError());
 constructor(){window.addEventListener('storage',e=>{if(e.key===KEY)this.changes.set(this.readChanges());if(e.key==='ttwr.admin.source'&&this.activated&&!this.unified()){this.mode.set(e.newValue==='live'?'live':'mock');if(this.mode()==='mock'&&!this.dataset())void this.load();}});}
 private readChanges():Changes{try{return {...emptyChanges(),...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{return emptyChanges();}}
 private merge<T>(base:T[],patch:Record<string,T>,id:(row:T)=>string):T[]{const map=new Map(base.map(row=>[id(row),row]));for(const row of Object.values(patch))map.set(id(row),row);return [...map.values()];}
 activate(){if(this.activated)return;this.activated=true;this.unified.set(true);this.select('mock');}
 select(mode:'mock'|'live'){
  if(this.unified())mode='mock';this.mode.set(mode);try{localStorage.setItem('ttwr.admin.source',mode);}catch{}
  if(mode==='mock'&&!this.dataset()&&!this.loading())void this.load();
 }
 async load(){
  if(this.loading())return;
  this.loading.set(true);this.error.set('');
  try{
   const response=await fetch('mock/mykingdom_campaign_mock_400.json',{cache:'no-store'});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const raw=await response.json();this.assertDataset(raw);
   this.dataset.set(raw);this.clockLoadedAt=Date.now();
  }catch{this.error.set('Không tải được bộ dữ liệu. Kiểm tra file mock/mykingdom_campaign_mock_400.json rồi thử lại.');}
  finally{this.loading.set(false);}
 }
 private assertDataset(raw:MockDataset){
  const arrays=['customers','events','stories','followups','vouchers','campaign_costs','content_metrics','orders','sessions','products','sales_handoffs'] as const;
  if(!raw||raw.metadata?.is_mock!==true||raw.metadata.schema_version!=='1.0'||arrays.some(k=>!Array.isArray(raw[k])))throw new Error('Invalid schema');
  const ids=new Set(raw.customers.map(c=>c.visitor_id));
  if(raw.customers.length!==400||ids.size!==400||raw.metadata.customer_count!==400||!Number.isFinite(Date.parse(raw.metadata.reporting_as_of)))throw new Error('Invalid customer cohort');
  if(raw.events.some(e=>!e.event_id||!ids.has(e.visitor_id)||!Number.isFinite(Date.parse(e.timestamp)))||new Set(raw.events.map(e=>e.event_id)).size!==raw.events.length)throw new Error('Invalid events');
  if(!raw.campaign?.name||!Array.isArray(raw.campaign.themes))throw new Error('Invalid settings');
 }
 writeRecord(key:string,value:unknown):boolean{
  const next=this.readChanges();
  if(key==='ttwr.settings')next.settings=value as CampaignSettings;
  else {
   const kinds=[['ttwr.story.','stories'],['ttwr.voucher.','vouchers'],['ttwr.note.','notes'],['ttwr.run.','runs']] as const;
   const found=kinds.find(([prefix])=>key.startsWith(prefix));if(!found)return false;
   (next[found[1]] as Record<string,unknown>)[key.slice(found[0].length)]=value;
  }
  return this.persist(next);
 }
 private persist(value:Changes):boolean{
  try{localStorage.setItem(KEY,JSON.stringify(value));this.changes.set(value);this.writeError.set('');return true;}
  catch{this.writeError.set('Không lưu được thay đổi vào bộ nhớ trình duyệt.');return false;}
 }
 nowTimestamp(){return this.mode()==='mock'&&this.dataset()?Date.parse(this.dataset()!.metadata.reporting_as_of)+Date.now()-this.clockLoadedAt:Date.now();}
 withdrawConsent(visitorId:string):boolean{
  if(this.mode()==='live'||(this.unified()&&!this.dataset()?.customers.some(c=>c.visitor_id===visitorId)))return this.live.withdrawConsent(visitorId);
  const subject=[...this.events()].reverse().find(e=>e.visitor_id===visitorId&&e.event_name==='marketing_consent_granted');if(!subject)return false;
  const event:TrackedEvent={...subject,event_id:'ADMIN_'+crypto.randomUUID(),event_name:'marketing_consent_withdrawn',timestamp:new Date(this.nowTimestamp()).toISOString(),actor:'admin',channel:'all'};
  const next=this.readChanges();next.events[event.event_id]=event;return this.persist(next);
 }
}
