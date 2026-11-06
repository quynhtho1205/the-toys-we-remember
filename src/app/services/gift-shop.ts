import { Injectable, computed, inject, signal } from '@angular/core';
import { MarTechService } from './martech-service';
export interface Recipient {id:string;kind:'self'|'child'|'other';nickname:string;ageBand:string;interests:string;color:string;favoriteToy:string;consentAt?:string}
export const newRecipient=():Recipient=>({id:'',kind:'child',nickname:'',ageBand:'',interests:'',color:'',favoriteToy:''});
export interface GiftProduct {id:string;name:string;theme:string;ages:string[];tags:string[];price:number;emoji:string;description:string}
export const GIFT_PRODUCTS:GiftProduct[]=[
{id:'GIFT01',name:'Hộp gạch sáng tạo',theme:'gach_lego',ages:['3–5','6–8','9–12','13+'],tags:['lắp ghép','xây nhà','sáng tạo','đỏ','vàng','lego'],price:399000,emoji:'🧱',description:'Lắp nhà, xe và những mô hình theo trí tưởng tượng.'},
{id:'GIFT02',name:'Gấu bông kể chuyện',theme:'bup_be',ages:['3–5','6–8','9–12','13+'],tags:['gấu','thú bông','kể chuyện','nâu','hồng'],price:249000,emoji:'🧸',description:'Người bạn mềm mại cho những câu chuyện mỗi ngày.'},
{id:'GIFT03',name:'Búp bê & ngôi nhà nhỏ',theme:'bup_be',ages:['3–5','6–8','9–12'],tags:['búp bê','nhập vai','hồng','tím','gia đình'],price:459000,emoji:'🪆',description:'Tự xây những câu chuyện về gia đình và bạn bè.'},
{id:'GIFT04',name:'Bàn cờ gia đình',theme:'board_game',ages:['6–8','9–12','13+'],tags:['cờ','tư duy','gia đình','chiến thuật','xanh'],price:329000,emoji:'🎲',description:'Một buổi chơi cùng gia đình với luật chơi dễ làm quen.'},
{id:'GIFT05',name:'Bộ diều sắc màu',theme:'canh_dieu',ages:['6–8','9–12','13+'],tags:['diều','ngoài trời','gió','xanh','vàng'],price:159000,emoji:'🪁',description:'Cùng người lớn tận hưởng những buổi chiều ngoài trời.'},
{id:'GIFT06',name:'Xe lắp ghép khám phá',theme:'gach_lego',ages:['6–8','9–12','13+'],tags:['xe','tàu','lắp ghép','xanh','đỏ','lego'],price:549000,emoji:'🏎️',description:'Lắp, tháo và biến đổi mô hình thành chuyến phiêu lưu mới.'},
{id:'GIFT07',name:'Bộ ghép hình động vật',theme:'gach_lego',ages:['3–5','6–8'],tags:['động vật','ghép hình','sáng tạo','vàng','xanh'],price:219000,emoji:'🧩',description:'Khám phá hình khối và ghép những người bạn động vật.'},
{id:'GIFT08',name:'Bộ trò chơi ký ức',theme:'board_game',ages:['3–5','6–8','9–12','13+'],tags:['trí nhớ','gia đình','cờ','tư duy','nhiều màu'],price:189000,emoji:'🃏',description:'Những lượt chơi ngắn để cả nhà cùng tham gia.'}
];
const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
interface Account {id:string;name:string}
interface SavedState {accounts:Account[];profiles:Record<string,Recipient[]>}
@Injectable({providedIn:'root'})
export class GiftShop {
 private tracking=inject(MarTechService);
 private readonly saved=signal<SavedState>(this.read('ttwr.gifts.v1',{accounts:[],profiles:{}}));
 readonly account=signal<Account|null>(this.readSession('ttwr.gifts.account',null));
 readonly recipient=signal<Recipient>(this.readSession('ttwr.gifts.recipient',newRecipient()));
 readonly maxBudget=signal(0);
 readonly cart=signal<Record<string,number>>(this.readSession('ttwr.gifts.cart',{}));
 readonly error=signal('');
 private readonly crmRevision=signal(0);
 constructor(){window.addEventListener('ttwr:crm-changed',()=>this.crmRevision.update(n=>n+1));window.addEventListener('storage',()=>{this.saved.set(this.read('ttwr.gifts.v1',{accounts:[],profiles:{}}));this.crmRevision.update(n=>n+1);});}
 readonly profiles=computed(()=>{this.crmRevision();const accountId=this.account()?.id||'';const crm=this.read<any>('ttwr.crm.v1.live',null);return (this.saved().profiles[accountId]||[]).filter(p=>!!p.consentAt).map(p=>{const child=crm?.children?.find((c:any)=>c.id===p.id&&c.familyId==='GIFT_'+accountId);return child?{...p,nickname:child.nickname,ageBand:['0–2','3–5','6–8','9–12','13+'].includes(child.ageBand.replace(' tuổi',''))?child.ageBand.replace(' tuổi',''):'',interests:child.interests??p.interests,color:child.favoriteColor??p.color,favoriteToy:child.favoriteToy??p.favoriteToy}:p;});});
 readonly recommendations=computed(()=>GIFT_PRODUCTS.map(p=>{
  const r=this.recipient(),reasons:string[]=[];let score=0;
  const match=(s:string)=>!!s.trim()&&p.tags.some(t=>norm(s).replaceAll('lap rap','lap ghep').includes(norm(t)));
  if(r.ageBand&&p.ages.includes(r.ageBand)){score+=4;reasons.push('Phù hợp nhóm tuổi '+r.ageBand);}
  if(match(r.interests)){score+=5;reasons.push('Gần với sở thích đã chọn');}
  if(match(r.favoriteToy)){score+=5;reasons.push('Liên quan món đồ chơi yêu thích');}
  if(match(r.color)){score++;reasons.push('Có tông màu bạn quan tâm');}
  if(!r.interests&&!r.favoriteToy&&p.theme===sessionStorage.getItem('theme_id')){score+=2;reasons.push('Gợi nhớ chủ đề Memory Card');}
  return {...p,score,reasons:reasons.length?reasons:['Gợi ý khám phá; chưa đủ thông tin để cá nhân hóa']};
 }).filter(p=>!this.recipient().ageBand||p.ages.includes(this.recipient().ageBand)).filter(p=>!this.maxBudget()||p.price<=this.maxBudget()).sort((a,b)=>b.score-a.score));
 readonly cartRows=computed(()=>GIFT_PRODUCTS.filter(p=>this.cart()[p.id]>0).map(p=>({...p,quantity:this.cart()[p.id]})));
 readonly subtotal=computed(()=>this.cartRows().reduce((s,p)=>s+p.price*p.quantity,0));
 private read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch{return fallback;}}
 private readSession<T>(key:string,fallback:T):T{try{return JSON.parse(sessionStorage.getItem(key)||'null')||fallback;}catch{return fallback;}}
 private persistSession(key:string,value:unknown){try{sessionStorage.setItem(key,JSON.stringify(value));this.error.set('');return true;}catch{this.error.set('Không lưu được dữ liệu phiên. Vui lòng kiểm tra bộ nhớ trình duyệt.');return false;}}
 private persist(next:SavedState){try{localStorage.setItem('ttwr.gifts.v1',JSON.stringify(next));this.saved.set(next);this.error.set('');return true;}catch{this.error.set('Không lưu được hồ sơ. Bạn vẫn có thể mua hàng mà không lưu.');return false;}}
 requestConsultation(input:{name:string;question:string;budget:number;phone:string;time:string;product:string;consultationConsent:boolean}) {
  if(input.consultationConsent!==true){this.error.set('Vui lòng đồng ý để nhân viên liên hệ tư vấn qua Zalo.');return null;}
  if(!input.name.trim()||!input.question.trim()||!input.time.trim()||!/^(\+84|0)\d{9}$/.test(input.phone.trim())||!Number.isFinite(input.budget)||input.budget<0){this.error.set('Điền tên, nhu cầu, số Zalo hợp lệ, thời gian liên hệ và ngân sách không âm.');return null;}
  const key='ttwr.crm.v1.live',data=this.read<any>(key,{families:[],children:[],consultations:[],history:[],orderLinks:{}});
  const visitorId=localStorage.getItem('ttwr.visitor')||'',familyId=this.account()?'GIFT_'+this.account()!.id:'F'+visitorId;
  const r=this.recipient(),childId=r.id||crypto.randomUUID(),id=crypto.randomUUID();
  const family={id:familyId,visitorId,name:input.name.trim(),owner:''};
  if(!data.families.some((f:any)=>f.id===familyId))data.families.push(family);
  if(!data.children.some((c:any)=>c.id===childId))data.children.push({id:childId,familyId,nickname:r.nickname||'Người nhận',birthday:'',ageBand:r.ageBand,theme:this.recommendations()[0]?.theme||'',budget:input.budget,birthdayOptIn:false,interests:r.interests});
  data.consultations.unshift({id,familyId,childId,question:input.question.trim(),status:'pending',owner:'',createdAt:new Date().toISOString(),note:'',budget:input.budget,preferredTime:input.time.trim(),contactLabel:'Zalo •••'+input.phone.trim().slice(-4),product:input.product,origin:'gift-shop',consultationConsentAt:new Date().toISOString()});
  try{localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new Event('ttwr:crm-changed'));}catch{this.error.set('Không lưu được yêu cầu. Vui lòng thử lại.');return null;}
  this.setRecipient({...r,id:childId});this.tracking.trackEvent('consult_request',{request_id:id,shop_demo:true,channel:'zalo',product_name:input.product});this.error.set('');return id;
 }
 login(name:string){const clean=name.trim().slice(0,80);if(!clean){this.error.set('Nhập tên tài khoản demo để tiếp tục.');return false;}const next=structuredClone(this.read<SavedState>('ttwr.gifts.v1',{accounts:[],profiles:{}}));let account=next.accounts.find(a=>norm(a.name)===norm(clean));if(!account){account={id:crypto.randomUUID(),name:clean};next.accounts.push(account);}if(!this.persist(next)||!this.persistSession('ttwr.gifts.account',account))return false;this.account.set(account);this.recipient.set(newRecipient());return true;}
 logout(){sessionStorage.removeItem('ttwr.gifts.account');sessionStorage.removeItem('ttwr.gifts.recipient');sessionStorage.removeItem('ttwr.gifts.cart');this.account.set(null);this.recipient.set(newRecipient());this.cart.set({});}
 setRecipient(value:Recipient){const clean={...value,nickname:value.nickname.trim().slice(0,80),interests:value.interests.trim().slice(0,200),color:value.color.trim().slice(0,80),favoriteToy:value.favoriteToy.trim().slice(0,150)};if(!this.persistSession('ttwr.gifts.recipient',clean))return false;this.recipient.set(clean);return true;}
 add(id:string,delta=1){const next={...this.cart(),[id]:Math.max(0,Math.min(20,(this.cart()[id]||0)+delta))};if(!this.persistSession('ttwr.gifts.cart',next))return false;this.cart.set(next);if(delta>0)this.tracking.trackEvent('add_to_cart',{product_id:id,shop_demo:true});return true;}
 saveProfile(value:Recipient,consent:boolean){const account=this.account();if(!consent||!account){this.error.set('Chỉ lưu hồ sơ khi đã chọn tài khoản demo và đồng ý lưu để gợi ý lần sau.');return null;}
 const profile={...value,id:value.id||crypto.randomUUID(),consentAt:new Date().toISOString()};const next=structuredClone(this.saved());const list=next.profiles[account.id]||[];next.profiles[account.id]=[...list.filter(p=>p.id!==profile.id),profile];if(!this.persist(next))return null;
 this.setRecipient(profile);this.syncFamily(profile);return profile;}
 private syncFamily(profile:Recipient){const account=this.account();if(!account)return;const key='ttwr.crm.v1.live';const data=this.read<any>(key,{families:[],children:[],consultations:[],history:[],orderLinks:{}});const visitorId=localStorage.getItem('ttwr.visitor')||'';const familyId='GIFT_'+account.id;
 if(!data.families.some((f:any)=>f.id===familyId))data.families.push({id:familyId,visitorId,name:account.name,owner:''});
 if(profile.kind==='child'){const child={id:profile.id,familyId,nickname:profile.nickname||'Bé chưa đặt tên',birthday:'',ageBand:profile.ageBand?profile.ageBand+' tuổi':'Chưa cung cấp',theme:this.recommendations()[0]?.theme||'',budget:0,birthdayOptIn:false,interests:profile.interests,favoriteColor:profile.color,favoriteToy:profile.favoriteToy,personalizationConsentAt:profile.consentAt};data.children=[...data.children.filter((c:any)=>c.id!==profile.id),child];}
 try{localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new Event('ttwr:crm-changed'));}catch{this.error.set('Hồ sơ đã lưu nhưng chưa cập nhật được CRM.');}}
 removeProfile(id:string){const account=this.account();if(!account)return false;const next=structuredClone(this.saved());next.profiles[account.id]=(next.profiles[account.id]||[]).filter(p=>p.id!==id);if(!this.persist(next))return false;const key='ttwr.crm.v1.live',data=this.read<any>(key,null);if(data){data.children=data.children.filter((c:any)=>c.id!==id);for(const order in data.orderLinks)if(data.orderLinks[order]===id)delete data.orderLinks[order];try{localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new Event('ttwr:crm-changed'));}catch{this.error.set('Chưa xóa được liên kết CRM.');return false;}}if(this.recipient().id===id)this.setRecipient(newRecipient());return true;}
 discountRate(voucher:string){const code=voucher.trim().toUpperCase();return code==='MEMORY15'?.15:code==='MYKID-NOSTALGIA-30'?.30:0;}
 checkout(save:boolean,voucher:string){if(!this.cartRows().length){this.error.set('Giỏ hàng đang trống.');return null;}if(save&&!this.account()){this.error.set('Chọn tài khoản demo trước khi đồng ý lưu hồ sơ.');return null;}const raw=this.recipient();const profile=save?this.saveProfile(raw,true):this.profiles().find(p=>p.id===raw.id)||null;if(save&&!profile)return null;const subtotal=this.subtotal(),discount=Math.round(subtotal*this.discountRate(voucher));const order={id:'DEMO_'+crypto.randomUUID().slice(0,8).toUpperCase(),timestamp:new Date().toISOString(),total:subtotal-discount,discount,items:this.cartRows().map(p=>({product_id:p.id,name:p.name,quantity:p.quantity,price:p.price})),recipient:raw.nickname||'Người nhận chưa đặt tên'};
 this.tracking.trackEvent('purchase',{order_id:order.id,order_value:order.total,revenue:order.total,items:order.items,channel:'demo_checkout',shop_demo:true,voucher_code:discount?voucher.trim().toUpperCase():'',recipient_id:profile?.id||'',account_id:this.account()?.id||''});
 if(profile?.kind==='child'){const key='ttwr.crm.v1.live',data=this.read<any>(key,null);if(data){data.orderLinks[order.id]=profile.id;try{localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new Event('ttwr:crm-changed'));}catch{this.error.set('Đã tạo đơn nhưng chưa nối được hồ sơ CRM.');}}}
 this.cart.set({});this.persistSession('ttwr.gifts.cart',{});sessionStorage.removeItem('ttwr.gifts.recipient');this.recipient.set(newRecipient());return order;}
}
