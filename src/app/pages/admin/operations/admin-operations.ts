import { AdminDataSource } from '../../../services/admin-data-source';
import { Component, computed, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignAdminStore, CampaignSettings, CampaignStory, LocalRun, VoucherDraft } from '../../../services/campaign-admin-store';
import { MarTechService, TrackedEvent } from '../../../services/martech-service';
import { analyze } from '../../../services/dashboard-analytics';
export interface AdminCustomer {
 id:string;userId:string;stage:string;theme:string;source:string;contactType:string;consent:boolean;group:string;last:string;
 sqlAt?:string;buyer:boolean;events:TrackedEvent[];
}
@Component({selector:'app-admin-operations',imports:[CommonModule,FormsModule],templateUrl:'./admin-operations.html',styleUrl:'./admin-operations.css'})
export class AdminOperations {
 readonly tab=input('customers');readonly events=input<TrackedEvent[]>([]);readonly history=input<TrackedEvent[]|null>(null);
 readonly store=inject(CampaignAdminStore);readonly tracking=inject(AdminDataSource);
 readonly query=signal('');readonly stageFilter=signal('all');readonly storyFilter=signal('all');
 readonly storyDialog=viewChild.required<ElementRef<HTMLDialogElement>>('storyDialog');
 readonly customerDialog=viewChild<ElementRef<HTMLDialogElement>>('customerDialog');
 closeCustomerBackdrop(e:MouseEvent){if(e.target===e.currentTarget)(e.currentTarget as HTMLDialogElement).close();}
 readonly simulationDialog=viewChild.required<ElementRef<HTMLDialogElement>>('simulationDialog');
 readonly simulationResult=signal<LocalRun|null>(null);
 readonly trialPage=signal(0);readonly followupPage=signal(0);readonly runPage=signal(0);
 readonly min=Math.min;
 pages(total:number){return Array.from({length:Math.ceil(total/10)},(_,i)=>i);}
 readonly selectedCustomer=signal('');readonly selectedStory=signal('');readonly notice=signal('');
 readonly customerPage=signal(0);readonly storyPage=signal(0);readonly orderPage=signal(0);readonly consentPage=signal(0);
 noteOwner='';noteText='';settingsDraft:CampaignSettings=structuredClone(this.store.settings());
 voucherCode='';voucherDiscount=15;voucherExpires=this.store.settings().end;voucherLimit=100;
 constructor(){effect(()=>{this.query();this.events();this.trialPage.set(0);this.followupPage.set(0);this.runPage.set(0);});effect(()=>{
  this.tab();this.tracking.mode();this.clearSearch();this.stageFilter.set('all');this.storyFilter.set('all');
  this.selectedCustomer.set('');this.selectedStory.set('');const dialog=this.storyDialog()?.nativeElement;if(dialog?.open)dialog.close();const cd=this.customerDialog()?.nativeElement;if(cd?.open)cd.close();this.notice.set('');
  this.simulationResult.set(null);const popup=this.simulationDialog()?.nativeElement;if(popup?.open)popup.close();
  this.settingsDraft=structuredClone(untracked(()=>this.store.settings()));
 });}
 money(value:unknown){const n=Number(value);return value!==null&&value!==undefined&&value!==''&&Number.isFinite(n)&&n>=0?n.toLocaleString('vi-VN')+' ₫':'—';}
 readonly customers=computed(()=>{
  const visible=new Set(this.events().map(e=>e.visitor_id));
  const grouped=new Map<string,TrackedEvent[]>();
  for(const e of this.tracking.events()){
   if(!visible.has(e.visitor_id))continue;
   if(!grouped.has(e.visitor_id))grouped.set(e.visitor_id,[]);
   grouped.get(e.visitor_id)!.push(e);
  }
  return [...grouped].map(([id,events]):AdminCustomer=>{
   const sorted=[...events].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
   const rev=[...sorted].reverse();const stats=analyze(sorted);const consent=this.store.consentFor(id);
   let lead=false,mql=false,sqlAt:string|undefined;let contact=false,granted=false;
   for(const e of sorted){
    if(e.event_name==='contact_info_submitted')contact=true;
    if(e.event_name==='marketing_consent_granted')granted=true;
    if(e.event_name==='marketing_consent_withdrawn')granted=false;
    if(contact&&granted)lead=true;
    if(lead&&['followup_click','product_collection_view'].includes(e.event_name))mql=true;
    if(mql&&['add_to_cart','consult_request'].includes(e.event_name))sqlAt??=e.timestamp;
   }
   return {id,userId:rev.find(e=>e.user_id)?.user_id||'Chưa có liên hệ',stage:stats.customers?'Customer':stats.sql?'SQL':stats.mql?'MQL':stats.lead?'Lead':'Khách ẩn danh',
    theme:rev.find(e=>e.theme_id)?.theme_id||'',source:sorted[0]?.utm_source||'direct',contactType:String(consent.contact?.['contact_type']||'—'),consent:consent.granted,
    group:String(rev.find(e=>e['ab_group'])?.['ab_group']||'—'),last:sorted.at(-1)!.timestamp,sqlAt,buyer:stats.customers>0,events:sorted};
  }).sort((a,b)=>b.last.localeCompare(a.last));
 });
 readonly leadCount=computed(()=>this.customers().filter(c=>c.events.some(e=>e.event_name==='contact_info_submitted')&&c.events.some(e=>e.event_name==='marketing_consent_granted')).length);
 readonly customerRows=computed(()=>this.customers().filter(c=>(this.stageFilter()==='all'||c.stage===this.stageFilter())&&this.matches(`${this.nickname(c.id)} ${c.id} ${c.userId} ${c.stage} ${this.theme(c.theme)}`)));
 readonly currentCustomer=computed(()=>this.customers().find(c=>c.id===this.selectedCustomer()));
 readonly timeline=computed(()=>[...(this.currentCustomer()?.events||[])].reverse().slice(0,30));
 readonly visibleStories=computed(()=>{
  const ids=new Set(this.events().filter(e=>e.event_name==='story_submit_success'||(this.tab()==='community'&&e.event_name==='ugc_submission')).map(e=>e['story_id']));
  return this.store.stories().filter(s=>ids.has(s.id)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 });
 readonly storyRows=computed(()=>this.visibleStories().filter(s=>(this.tab()!=='community'||s.submitted)&&
  (this.storyFilter()==='all'||s.status===this.storyFilter())&&this.matches(`${s.nickname} ${s.storyText} ${this.theme(s.theme_id)} ${s.id}`)));
 readonly currentStory=computed(()=>this.store.stories().find(s=>s.id===this.selectedStory()));
 readonly orderRows=computed(()=>{
  const map=new Map<string,TrackedEvent>();
  for(const e of this.events().filter(e=>['purchase','voucher_redeem'].includes(e.event_name)))map.set(String(e['order_id']||e.event_id),e);
  return [...map.values()].filter(e=>this.matches(`${e['order_id']||e.event_id} ${e.visitor_id} ${e['voucher_code']||''}`)).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
 });
 readonly consentStats=computed(()=>analyze(this.events(),this.history()??this.tracking.events()).consentRows);
 readonly consentRows=computed(()=>this.customers().filter(c=>c.events.some(e=>e.event_name.startsWith('marketing_consent')||e.event_name==='contact_info_submitted')).filter(c=>this.matches(`${c.id} ${c.userId} ${c.consent?'đồng ý':'chưa đồng ý hủy'}`)));
 readonly consentLog=computed(()=>this.events().filter(e=>['marketing_consent_granted','marketing_consent_declined','marketing_consent_withdrawn','ugc_usage_consent_granted'].includes(e.event_name)).reverse().slice(0,20));
 readonly eligibleCustomers=computed(()=>this.customers().filter(c=>c.stage!=='Khách ẩn danh'&&this.matches(`${c.id} ${c.stage} ${this.theme(c.theme)}`)));
 readonly handoffs=computed(()=>this.customers().filter(c=>c.sqlAt&&!c.buyer&&this.tracking.nowTimestamp()-Date.parse(c.sqlAt)>=24*3600000));
 readonly followupRows=computed(()=>{
  const ids=new Set(this.customers().map(c=>c.id));
  return (this.tracking.mode()==='mock'?this.tracking.dataset()?.followups||[]:[]).filter(f=>ids.has(f.visitor_id)&&this.matches(`${f.visitor_id} ${f.channel} ${f.body} ${f.status}`)).sort((a,b)=>b.triggered_at.localeCompare(a.triggered_at));
 });
 contactLabel(id:string){const c=this.tracking.customers().find(c=>c.visitor_id===id);return c?.contact_info?[c.contact_info.email,c.contact_info.phone].filter(Boolean).join(' · '):'Chưa có thông tin hiển thị';}
 nickname(id:string){return this.tracking.customers().find(c=>c.visitor_id===id)?.display_nickname||this.short(id);}
 readonly recentRuns=computed(()=>this.store.runs().filter(r=>this.customers().some(c=>c.id===r.visitorId)&&this.matches(`${r.visitorId} ${r.channel} ${r.reason} ${r.body}`)).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)));
 readonly abRows=computed(()=>['A','B'].map(group=>{
  const people=this.customers().filter(c=>c.group===group&&c.stage!=='Khách ẩn danh');
  const ids=new Set(people.map(c=>c.id));
  const delivered=this.events().filter(e=>ids.has(e.visitor_id)&&e.event_name==='followup_delivered').length;
  const clicked=this.events().filter(e=>ids.has(e.visitor_id)&&e.event_name==='followup_click').length;
  return {group,leads:people.length,delivered,clicked,rate:delivered?(clicked/delivered*100).toFixed(1)+'%':'—'};
 }));
 readonly summary=computed(()=>({stories:this.visibleStories().length,ugc:this.visibleStories().filter(s=>s.submitted).length,pending:this.visibleStories().filter(s=>s.submitted&&s.status==='pending').length,featured:this.visibleStories().filter(s=>s.featured).length,approved:this.visibleStories().filter(s=>s.status==='approved').length}));
 matches(text:string){return text.toLocaleLowerCase('vi').includes(this.query().trim().toLocaleLowerCase('vi'));}
 theme(id:string){return this.store.settings().themes.find(t=>t.id===id)?.name||id||'Chưa chọn';}
 label(status:string){return ({pending:'Chờ duyệt',approved:'Đã duyệt',hidden:'Đã ẩn',create:'Sau tạo card',share:'Khi chia sẻ',connect:'Trang cộng đồng',simulated:'Đã mô phỏng',blocked:'Đã chặn'} as Record<string,string>)[status]||status;}
 pct(n:number|null){return n===null?'—':n.toLocaleString('vi-VN',{maximumFractionDigits:1})+'%';}
 ugcPermission(c:AdminCustomer){const count=this.store.stories().filter(s=>s.visitorId===c.id&&s.ugcConsent).length;return count?`${count} câu chuyện có quyền`:c.events.some(e=>e.event_name==='ugc_usage_consent_granted')?'Có sự kiện cấp quyền':'Chưa cấp quyền';}
 short(id:string){return id.length>15?id.slice(0,13)+'…':id;}
 openStory(id:string){this.selectedStory.set(id);this.storyDialog().nativeElement.showModal();}
 closeStory(){this.storyDialog().nativeElement.close();this.selectedStory.set('');}
 closeOnBackdrop(event:MouseEvent){if(event.target===event.currentTarget)this.closeStory();}
 openCustomer(c:AdminCustomer){this.selectedCustomer.set(c.id);const note=this.store.notes().find(n=>n.visitorId===c.id);this.noteOwner=note?.owner||'';this.noteText=note?.note||'';}
 saveNote(){const id=this.selectedCustomer();if(!id)return;this.feedback(this.store.saveNote({visitorId:id,owner:this.noteOwner.trim(),note:this.noteText.trim(),updatedAt:new Date(this.tracking.nowTimestamp()).toISOString()}),'Đã lưu ghi chú tư vấn.');}
 moderate(s:CampaignStory,status:CampaignStory['status']){this.feedback(this.store.moderate(s.id,status),'Đã cập nhật trạng thái bài trong bản demo.');}
 feature(s:CampaignStory){this.feedback(this.store.feature(s.id),'Đã cập nhật câu chuyện nổi bật.');}
 withdraw(c:AdminCustomer){this.feedback(this.tracking.withdrawConsent(c.id),'Đã hủy nhận tin và chặn mô phỏng follow-up cho khách này.');}
 simulate(c:AdminCustomer){const run=this.store.simulate(c.id,this.theme(c.theme));this.runPage.set(0);this.simulationResult.set(run);this.simulationDialog().nativeElement.showModal();}
 closeSimulation(){this.simulationDialog().nativeElement.close();}
 closeSimulationBackdrop(event:MouseEvent){if(event.target===event.currentTarget)this.closeSimulation();}
 saveTemplates(){const current=this.store.settings();this.feedback(this.store.saveSettings({...current,templateA:this.settingsDraft.templateA,templateB:this.settingsDraft.templateB}),'Đã lưu nội dung tin mô phỏng.');}
 saveSettings(){this.feedback(this.store.saveSettings(structuredClone(this.settingsDraft)),'Đã lưu cấu hình Admin demo.');}
 reloadSettings(){this.settingsDraft=structuredClone(this.store.settings());this.notice.set('Đã tải lại cấu hình đã lưu.');}
 saveVoucher(){const v:VoucherDraft={id:crypto.randomUUID(),code:this.voucherCode.trim().toUpperCase(),discount:Number(this.voucherDiscount),expires:this.voucherExpires,limit:Number(this.voucherLimit),active:true};if(this.store.saveVoucher(v)){this.voucherCode='';this.notice.set('Đã lưu voucher nháp trong demo.');}else this.notice.set(this.store.error());}
 toggleVoucher(v:VoucherDraft){this.feedback(this.store.saveVoucher({...v,active:!v.active}),'Đã cập nhật voucher nháp.');}
 redemptions(code:string){return this.orderRows().filter(e=>e['voucher_code']===code).length;}
 feedback(ok:boolean,message:string){this.notice.set(ok?message:this.store.error()||'Chưa lưu được thay đổi.');}
 clearSearch(){this.trialPage.set(0);this.followupPage.set(0);this.runPage.set(0);this.query.set('');this.customerPage.set(0);this.storyPage.set(0);this.orderPage.set(0);this.consentPage.set(0);}
}
