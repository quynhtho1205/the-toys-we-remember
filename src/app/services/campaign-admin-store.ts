import { AdminDataSource } from './admin-data-source';
import { Injectable, computed, inject, signal } from '@angular/core';
import { MemoryCardFormData } from '../models/martech-events.model';
import { MarTechService } from './martech-service';

export interface CampaignStory extends MemoryCardFormData {
 id:string; cardId:string; visitorId:string; sessionId:string; createdAt:string;
 ugcConsent:boolean; submitted:boolean; status:'pending'|'approved'|'hidden'; featured:boolean; cardStatus?:'success'|'failed';
}
export interface CampaignSettings {
 name:string; start:string; end:string; dailyLimit:number; weeklyLimit:number; abEnabled:boolean;
 templateA:string; templateB:string; themes:{id:string;name:string;products:string}[];
}
export interface VoucherDraft {id:string;code:string;discount:number;expires:string;limit:number;active:boolean}
export interface LocalRun {id:string;visitorId:string;timestamp:string;channel:string;group:string;status:'simulated'|'blocked';reason:string;body:string}
export interface CustomerNote {visitorId:string;owner:string;note:string;updatedAt:string}
const defaults:CampaignSettings={
 name:'The Toys We Remember',start:'2026-11-02',end:'2026-12-27',dailyLimit:1,weeklyLimit:3,abEnabled:true,
 templateA:'Cảm ơn bạn đã chia sẻ ký ức! Khám phá những món đồ chơi để cùng tạo ký ức mới.',
 templateB:'Ký ức về {theme} vẫn còn ở đây. Khám phá bộ sưu tập theo chủ đề bạn yêu thích!',
 themes:[{id:'gach_lego',name:'Lắp ghép',products:'lego-classic-10698'},{id:'bup_be',name:'Búp bê & thú bông',products:'barbie-retro-signature'},{id:'board_game',name:'Trò chơi bàn',products:'monopoly-vintage-wood'},{id:'canh_dieu',name:'Ngoài trời',products:''}]
};
@Injectable({providedIn:'root'})
export class CampaignAdminStore {
 private tracking=inject(AdminDataSource);
 readonly error=signal('');
 private liveStories=signal<CampaignStory[]>(this.readRecords<CampaignStory>('ttwr.story.'));
 private liveVouchers=signal<VoucherDraft[]>(this.readRecords<VoucherDraft>('ttwr.voucher.'));
 private liveRuns=signal<LocalRun[]>(this.readRecords<LocalRun>('ttwr.run.'));
 private liveNotes=signal<CustomerNote[]>(this.readRecords<CustomerNote>('ttwr.note.'));
 private liveSettings=signal<CampaignSettings>(this.readSettings());
 readonly campaignStories=this.liveStories.asReadonly();
 readonly stories=computed(()=>this.tracking.unified()?[...new Map([...this.tracking.storyRecords(),...this.liveStories()].map(r=>[r.id,r])).values()]:this.tracking.mode()==='mock'?this.tracking.storyRecords():this.liveStories());
 readonly vouchers=computed(()=>this.tracking.unified()?[...new Map([...this.tracking.voucherRecords(),...this.liveVouchers()].map(r=>[r.id,r])).values()]:this.tracking.mode()==='mock'?this.tracking.voucherRecords():this.liveVouchers());
 readonly runs=computed(()=>this.tracking.unified()?[...new Map([...this.tracking.runRecords(),...this.liveRuns()].map(r=>[r.id,r])).values()]:this.tracking.mode()==='mock'?this.tracking.runRecords():this.liveRuns());
 readonly notes=computed(()=>this.tracking.unified()?[...new Map([...this.tracking.noteRecords(),...this.liveNotes()].map(r=>[r.visitorId,r])).values()]:this.tracking.mode()==='mock'?this.tracking.noteRecords():this.liveNotes());
 readonly settings=computed(()=>this.tracking.mode()==='mock'?(this.tracking.settingsRecord()||defaults):this.liveSettings());
 constructor(){window.addEventListener('storage',()=>this.refresh());}
 private readRecords<T>(prefix:string):T[]{
  const records:T[]=[];
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;
   try {const r=JSON.parse(localStorage.getItem(key)||'null');if(r)records.push(r);}catch{}
  }
  return records;
 }
 private readSettings():CampaignSettings{
  try{return {...structuredClone(defaults),...JSON.parse(localStorage.getItem('ttwr.settings')||'{}')};}catch{return structuredClone(defaults);}
 }
 refresh(){this.liveStories.set(this.readRecords('ttwr.story.'));this.liveVouchers.set(this.readRecords('ttwr.voucher.'));this.liveRuns.set(this.readRecords('ttwr.run.'));this.liveNotes.set(this.readRecords('ttwr.note.'));this.liveSettings.set(this.readSettings());}
 private write(key:string,value:unknown,forceLive=false):boolean{
  if(!forceLive&&this.tracking.mode()==='mock'&&!(this.tracking.unified()&&localStorage.getItem(key))){const ok=this.tracking.writeRecord(key,value);this.error.set(ok?'':this.tracking.writeError());return ok;}
  try{localStorage.setItem(key,JSON.stringify(value));this.error.set('');this.refresh();return true;}
  catch{this.error.set('Không lưu được thay đổi. Bộ nhớ trình duyệt có thể đã đầy.');return false;}
 }
 captureStory(data:MemoryCardFormData,ugc:boolean):CampaignStory|null{
  const story:CampaignStory={...data,id:crypto.randomUUID(),cardId:'CARD_'+crypto.randomUUID(),visitorId:localStorage.getItem('ttwr.visitor')||'',sessionId:sessionStorage.getItem('session_id')||'',createdAt:new Date().toISOString(),ugcConsent:ugc,submitted:ugc,status:'pending',featured:false};
  return this.write('ttwr.story.'+story.id,story,true)?story:null;
 }
 updateCampaignUgc(id:string,allowed:boolean):boolean{
  const story=this.liveStories().find(s=>s.id===id&&s.visitorId===localStorage.getItem('ttwr.visitor'));
  if(!story){this.error.set('Không tìm thấy câu chuyện của bạn. Hãy tạo thẻ trước khi gửi Gallery.');return false;}
  const next={...story,ugcConsent:allowed,submitted:allowed,status:allowed?(story.ugcConsent?story.status:'pending'):'hidden',featured:allowed?story.featured:false} as CampaignStory;
  return this.write('ttwr.story.'+story.id,next,true);
 }
 moderate(id:string,status:CampaignStory['status']):boolean{
  const story=this.stories().find(s=>s.id===id);if(!story)return false;
  if(status==='approved'&&(!story.ugcConsent||!story.submitted)){this.error.set('Chưa có quyền sử dụng UGC hoặc khách chưa gửi bài cộng đồng.');return false;}
  return this.write('ttwr.story.'+id,{...story,status,featured:status==='approved'?story.featured:false});
 }
 feature(id:string):boolean{
  const story=this.stories().find(s=>s.id===id);
  if(!story||!story.ugcConsent||story.status!=='approved'){this.error.set('Chỉ chọn nổi bật cho bài đã duyệt và có quyền UGC.');return false;}
  return this.write('ttwr.story.'+id,{...story,featured:!story.featured});
 }
 saveNote(note:CustomerNote){return this.write('ttwr.note.'+note.visitorId,note);}
 saveVoucher(v:VoucherDraft):boolean{
  if(!/^[A-Z0-9_-]{3,40}$/.test(v.code)||v.discount<=0||v.discount>100||!Number.isInteger(v.limit)||v.limit<1||!v.expires){this.error.set('Kiểm tra mã voucher, mức giảm 1–100%, hạn dùng và số lượt.');return false;}
  if(this.vouchers().some(r=>r.code===v.code&&r.id!==v.id)){this.error.set('Mã voucher đã tồn tại.');return false;}
  return this.write('ttwr.voucher.'+v.id,v);
 }
 saveSettings(s:CampaignSettings):boolean{
  if(!s.name.trim()||!s.start||!s.end||s.end<s.start||!Number.isInteger(s.dailyLimit)||s.dailyLimit<1||s.dailyLimit>1||!Number.isInteger(s.weeklyLimit)||s.weeklyLimit<1||s.weeklyLimit>3||!s.templateA.trim()||!s.templateB.trim()||s.themes.some(t=>!t.name.trim())){
   this.error.set('Kiểm tra tên, ngày kết thúc, chủ đề và nội dung tin. Giới hạn tối đa 1 tin/ngày, 3 tin/tuần.');return false;
  }
  return this.write('ttwr.settings',s);
 }
 recordSimulation(run:LocalRun){return this.write('ttwr.run.'+run.id,run);}
 consentFor(visitorId:string){
  const events=this.tracking.events().filter(e=>e.visitor_id===visitorId);
  const contacts=[...events].reverse().filter(e=>e.event_name==='contact_info_submitted');
  const contact=contacts.find(e=>e['contact_type']==='zalo')||contacts[0];
  const choice=[...events].reverse().find(e=>['marketing_consent_granted','marketing_consent_withdrawn'].includes(e.event_name));
  return {contact,choice,granted:choice?.event_name==='marketing_consent_granted'};
 }
 simulate(visitorId:string,theme:string):LocalRun{
  const consent=this.consentFor(visitorId);const now=new Date(this.tracking.nowTimestamp());const settings=this.settings();
  const sent=this.runs().filter(r=>r.visitorId===visitorId&&r.status==='simulated');
  const baseline=this.tracking.mode()==='mock'?(this.tracking.dataset()?.followups||[]).filter(f=>f.visitor_id===visitorId&&f.status==='delivered'&&f.delivered_at).map(f=>({timestamp:f.delivered_at!})):[];
  const sentTimes=[...sent,...baseline];
  const vnDay=(date:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(date));
  const previousClick=[...this.tracking.events()].reverse().find(e=>e.visitor_id===visitorId&&e.event_name==='followup_click');
  let reason=!consent.granted?'Chưa đồng ý hoặc đã hủy nhận tin':!consent.contact?'Thiếu liên hệ hợp lệ':'';
  if(!reason&&previousClick)reason='Khách đã bấm tin; dừng nhắc lại';
  if(!reason&&sentTimes.filter(r=>vnDay(r.timestamp)===vnDay(now.toISOString())).length>=settings.dailyLimit)reason='Đạt giới hạn tin trong ngày';
  if(!reason&&sentTimes.filter(r=>now.getTime()-Date.parse(r.timestamp)<7*86400000).length>=settings.weeklyLimit)reason='Đạt giới hạn 7 ngày';
  const contactType=String(consent.contact?.['contact_type']||'');
  if(!reason&&contactType!=='zalo')reason='Kênh liên hệ chưa hợp lệ';
  const group=settings.abEnabled?String(consent.choice?.['ab_group']||'A'):'A';
  const run:LocalRun={id:crypto.randomUUID(),visitorId,timestamp:now.toISOString(),channel:contactType||'—',group,status:reason?'blocked':'simulated',reason:reason||'Mô phỏng thành công; không gửi ra ngoài',body:(group==='B'?settings.templateB:settings.templateA).replaceAll('{theme}',theme||'đồ chơi tuổi thơ')};
  this.write('ttwr.run.'+run.id,run);return run;
 }
}
