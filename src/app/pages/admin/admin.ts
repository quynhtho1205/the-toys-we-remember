import { FamilyPanel } from './family/family';
import { Livestream } from './livestream/livestream';
import { AdminDataSource } from '../../services/admin-data-source';
import { ActivatedRoute } from '@angular/router';
import { AdminOperations } from './operations/admin-operations';
import { CampaignAdminStore } from '../../services/campaign-admin-store';
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MarTechService } from '../../services/martech-service';
import { analyze, ratio } from '../../services/dashboard-analytics';

/** Six logical groups for sidebar visual grouping (no structural change to tabs array). */
export const ADMIN_GROUPS = [
  { label: 'PHÂN TÍCH & NỘI DUNG', tabs: ['livestream'] },
  { label: 'TỔNG QUAN', tabs: ['overview'] },
  { label: 'KHÁCH HÀNG & GIA ĐÌNH', tabs: ['customers', 'families', 'consultation'] },
  { label: 'NỘI DUNG & CỘNG ĐỒNG', tabs: ['stories', 'community'] },
  { label: 'ĐƠN HÀNG & VOUCHER', tabs: ['orders'] },
  { label: 'VẬN HÀNH & CẤU HÌNH', tabs: ['automation', 'consent', 'settings'] },
];

/** Sibling tabs within the same group — used to render subnav pills. */
export function getGroupPeers(tabId: string, tabs: { id: string; name: string; icon: string }[]): { id: string; name: string; icon: string }[] {
  const group = ADMIN_GROUPS.find((g) => g.tabs.includes(tabId));
  if (!group || group.tabs.length < 2) return [];
  return group.tabs.map((id) => tabs.find((t) => t.id === id)!).filter(Boolean);
}

@Component({
 selector:'app-admin', imports:[CommonModule,FormsModule,RouterLink,AdminOperations,Livestream,FamilyPanel],
 templateUrl:'./admin.html', styleUrl:'./admin.css'
})
export class Admin {
 readonly adminStore=inject(CampaignAdminStore);
 readonly activeTab=signal('overview');
 readonly tabs=[
  {id:'livestream',name:'Phân tích & Ý tưởng nội dung',icon:'✦',description:'Từ bình luận đa kênh đến nhu cầu nổi bật và bản nháp bài post, video.'},
  {id:'overview',name:'Tổng quan',icon:'▦',description:'Theo dõi hành trình từ một ký ức đến một kết nối mới.'},
  {id:'customers',name:'Khách hàng & Lead',icon:'◉',description:'Hồ sơ khách hàng, trạng thái phễu và lịch sử tương tác.'},
  {id:'families',name:'Gia đình & Hồ sơ con',icon:'♡',description:'Liên kết phụ huynh, các bé và lịch sử chăm sóc.'},
  {id:'consultation',name:'Tư vấn & Chatbot',icon:'☏',description:'Ghi nhận nhu cầu, gợi ý sản phẩm và tiếp nhận tư vấn.'},
  {id:'stories',name:'Câu chuyện & Memory Card',icon:'▧',description:'Lưu giữ câu chuyện và xem lại những thẻ ký ức đã tạo.'},
  {id:'community',name:'Cộng đồng & UGC',icon:'★',description:'Kiểm duyệt bài cộng đồng và lựa chọn câu chuyện nổi bật.'},
  {id:'automation',name:'Chăm sóc & Automation',icon:'↗',description:'Thiết kế nội dung, kiểm tra điều kiện và mô phỏng follow-up.'},
  {id:'orders',name:'Đơn hàng & Voucher',icon:'◇',description:'Theo dõi giao dịch đã ghi nhận và quản lý voucher nháp.'},
  {id:'consent',name:'Consent & Quyền dữ liệu',icon:'✓',description:'Theo dõi sự đồng ý và quyền sử dụng dữ liệu của khách.'},
  {id:'settings',name:'Cấu hình Campaign',icon:'⚙',description:'Thông tin chiến dịch và quy tắc vận hành của bản demo.'},
 ];

 /** Grouped sidebar nav — each group has a label and its tabs. */
 readonly navGroups = ADMIN_GROUPS.map((g) => ({
   ...g,
   items: g.tabs.map((id) => this.tabs.find((t) => t.id === id)!).filter(Boolean),
 }));

 /** Sibling tabs within the same visual group for subnav pills. */
 readonly groupPeers = computed(() => getGroupPeers(this.activeTab(), this.tabs));

 readonly currentTab=computed(()=>this.tabs.find(t=>t.id===this.activeTab())||this.tabs[0]);
 constructor(){
  this.tracking.activate();

  inject(ActivatedRoute).queryParamMap.subscribe(params=>{
   const id=params.get('tab')||'overview';
   this.activeTab.set(this.tabs.some(t=>t.id===id)?id:'overview');
   this.search.set('');this.page.set(0);
   // Each tab opens at its own heading; preserve data filters between tabs.
   if(typeof window.scrollTo==='function') window.scrollTo({top:0});
  });
 }

 readonly tracking = inject(AdminDataSource);
 readonly source = signal('all'); readonly device = signal('all');
 readonly from = signal(''); readonly to = signal(''); readonly search = signal('');
 readonly page = signal(0);
 readonly sources = computed(()=> [...new Set(this.tracking.events().map(e=>e.utm_source))].sort());
 readonly history = computed(()=>this.tracking.events().filter(e=>
   (!this.to() || this.day(e.timestamp)<=this.to())));
 readonly acquisitionSources=computed(()=>new Map(this.tracking.customers().map(c=>[c.visitor_id,c.source])));
 readonly filtered = computed(()=>this.history().filter(e=>
   (this.source()==='all'||(this.tracking.mode()==='mock'?this.acquisitionSources().get(e.visitor_id):e.utm_source)===this.source()) &&
   (this.device()==='all'||e.device===this.device()) &&
   (!this.from() || this.day(e.timestamp)>=this.from())));
 readonly stats = computed(()=>analyze(this.filtered(),this.history()));
 readonly consentTotal=computed(()=>{
    const r=this.stats().consentRows;
    const shown=r.reduce((n,x)=>n+x.shown,0),granted=r.reduce((n,x)=>n+x.granted,0);
    return {shown,granted,rate:ratio(granted,shown)};
    });
 readonly matching = computed(()=>[...this.filtered()].reverse().filter(e=>
   `${e.event_name} ${this.eventLabel(e.event_name)} ${e.visitor_id} ${e.session_id} ${e.user_id||''}`.toLowerCase().includes(this.search().toLowerCase())));
 readonly rows = computed(()=>this.matching().slice(this.page()*15,this.page()*15+15));
 readonly logOpen=signal(false);
 readonly shownRows=computed(()=>this.logOpen()?this.rows():this.matching().slice(0,5));
 readonly lastUpdate = computed(()=>this.tracking.events().at(-1)?.timestamp);
 readonly finance=computed(()=>{
  const data=this.tracking.mode()==='mock'?this.tracking.dataset():null;
  if(!data)return null;
  const costs=data.campaign_costs.filter(c=>this.source()==='all'||c.channel===this.source()).filter(c=>{
   const start=new Date(data.campaign.start+'T00:00:00+07:00');start.setUTCDate(start.getUTCDate()+(c.week-1)*7);
   const end=new Date(start.getTime()+7*86400000-1);return (!this.from()||this.day(end.toISOString())>=this.from())&&(!this.to()||this.day(start.toISOString())<=this.to());
  });
  const total=costs.reduce((n,c)=>n+c.amount,0),ads=costs.filter(c=>c.cost_type==='quang_cao').reduce((n,c)=>n+c.amount,0);
  const firstBuyers=new Set(this.filtered().filter(e=>['purchase','voucher_redeem'].includes(e.event_name)&&e['campaign_attributed']===true).map(e=>e.visitor_id));
  const s=this.stats(),aov=s.orders?s.revenue/s.orders:null;
  return {total,ads,aov,cac:firstBuyers.size?total/firstBuyers.size:null,roas:ads?s.revenue/ads:null,ltv:aov===null?null:aov*data.campaign.ltv_total_purchases_12m};
 });
 readonly funnel = computed(()=>{
   const s=this.stats();
   return [
    {name:'Khám phá microsite',value:this.landingSessions(),note:'Phiên xem landing page'},
    {name:'Bắt đầu kể chuyện',value:this.sessions('story_form_start'),note:'Phiên bắt đầu form'},
    {name:'Gửi câu chuyện',value:s.stories,note:'Phiên gửi thành công'},
    {name:'Tạo memory card',value:s.cards,note:'Phiên tạo card thành công'},
    {name:'Xem bộ sưu tập',value:s.collection,note:'Phiên mở trang sản phẩm'},
   ];
 });
 selectData(mode:'live'|'mock'){this.tracking.select(mode);this.reset();}
 day(timestamp:string) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp)); }
 sessions(name:string) { return new Set(this.filtered().filter(e=>e.event_name===name).map(e=>e.session_id)).size; }
 landingSessions() { return this.sessions('landing_page_view'); }
 percent(value:number|null) { return value===null?'—':`${value.toLocaleString('vi-VN',{maximumFractionDigits:1})}%`; }
 rate(n:number,d:number) { return this.percent(ratio(n,d)); }
 width(n:number,total:number) { return total?Math.max(0,Math.min(100,n/total*100)):0; }
 label(value:string) {
   return ({gach_lego:'Lắp ghép',bup_be:'Búp bê & thú bông',board_game:'Trò chơi bàn',canh_dieu:'Ngoài trời',lap_ghep:'Lắp ghép',tro_choi_ban:'Trò chơi bàn',ngoai_troi:'Ngoài trời',create:'Sau tạo card',share:'Khi chia sẻ',connect:'Trang cộng đồng'} as Record<string,string>)[value] || value;
 }
 eventLabel(name:string){
 return ({
  campaign_link_click:'Bấm link campaign',
  session_start:'Bắt đầu phiên truy cập',
  landing_page_view:'Xem trang chủ',
  memory_theme_select:'Chọn chủ đề ký ức',
  story_form_start:'Bắt đầu kể chuyện',
  story_submit:'Gửi câu chuyện',
  memory_card_create:'Tạo Memory Card',
  collection_view:'Xem bộ sưu tập',
  purchase:'Mua hàng',
  voucher_redeem:'Dùng voucher',
 } as Record<string,string>)[name] || name;
}
 scrollTo(id:string,event:Event) { event.preventDefault();document.getElementById(id)?.scrollIntoView({behavior:'smooth'}); }
 reset() { this.source.set('all');this.device.set('all');this.from.set('');this.to.set('');this.search.set('');this.page.set(0); }
 exportCsv() {
   const columns=['event_id','event_name','timestamp','session_id','visitor_id','user_id','utm_source','theme_id','device','consent_source','consent_impression_id','ab_group','order_id','order_value'];
   const cell=(v:unknown)=> { const s=String(v??'');return '"'+(/^[=+\-@]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'; };
   const csv='\uFEFF'+[columns,...this.filtered().map(e=>columns.map(k=>e[k]))].map(row=>row.map(cell).join(',')).join('\r\n');
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='the-toys-we-remember-events.csv';a.click();URL.revokeObjectURL(url);
 }
}
