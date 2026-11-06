import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ScheduledPost {
 id:string; draftId:string; source:'comments'|'gallery'; mode:string;
 title:string; hook:string; outline:string; cta:string; visualDirection:string; format:string;
 channel:string; mediaNote:string; scheduledAt:string; createdAt:string;
 status:'scheduled'|'simulated'|'cancelled'; processedAt?:string;
}
const KEY='ttwr.content.schedules.v1';
@Component({selector:'app-scheduled-posts',imports:[CommonModule,FormsModule],templateUrl:'./scheduled-posts.html',styleUrl:'./scheduled-posts.css'})
export class ScheduledPosts {
 readonly active=input(false);readonly mode=input('mock');readonly viewSchedule=output<void>();
 readonly dialog=viewChild.required<ElementRef<HTMLDialogElement>>('scheduleDialog');
 readonly posts=signal<ScheduledPost[]>([]);readonly selected=signal<ScheduledPost|null>(null);
 readonly feedback=signal('');readonly error=signal('');readonly confirmed=signal(false);readonly page=signal(0);
 readonly rows=computed(()=>this.posts().filter(p=>p.mode===this.mode()).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)));
 readonly pageNumbers=computed(()=>Array.from({length:Math.ceil(this.rows().length/10)},(_,i)=>i));
 channel='Facebook';mediaNote='';dateTime='';approved=false;
 constructor(){
  try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(data))this.posts.set(data);}catch{this.error.set('Không đọc được lịch đã lưu.');}
  this.reconcile();const timer=setInterval(()=>this.reconcile(),15000);inject(DestroyRef).onDestroy(()=>clearInterval(timer));
  effect(()=>{this.mode();this.page.set(0);this.selected.set(null);this.confirmed.set(false);const dialog=this.dialog()?.nativeElement;if(dialog?.open)dialog.close();});
 }
 private persist(next:ScheduledPost[]){try{localStorage.setItem(KEY,JSON.stringify(next));this.posts.set(next);return true;}catch{this.error.set('Không lưu được lịch. Kiểm tra bộ nhớ trình duyệt rồi thử lại.');return false;}}
 reconcile(now=Date.now()){
  let changed=false;const next=this.posts().map(p=>{if(p.status==='scheduled'&&Date.parse(p.scheduledAt)<=now){changed=true;return {...p,status:'simulated' as const,processedAt:new Date(now).toISOString()};}return p;});
  if(changed)this.persist(next);
 }
 open(d:any,source:'comments'|'gallery'){
  this.reconcile();this.error.set('');this.confirmed.set(false);this.approved=false;
  const existing=this.posts().find(p=>p.draftId===d.id&&p.source===source&&p.mode===this.mode()&&p.status==='scheduled');
  const post:ScheduledPost=existing||{id:crypto.randomUUID(),draftId:d.id,source,mode:this.mode(),title:d.title||'',hook:d.hook||'',outline:d.outline||'',cta:d.cta||'',visualDirection:d.visualDirection||'',format:d.format==='post'?'post':'video',channel:'Facebook',mediaNote:'',scheduledAt:'',createdAt:new Date().toISOString(),status:'scheduled'};
  this.selected.set(post);this.channel=post.channel;this.mediaNote=post.mediaNote;this.dateTime=post.scheduledAt?this.localTime(post.scheduledAt):this.localTime(new Date(Date.now()+3600000).toISOString());
  this.dialog().nativeElement.showModal();
 }
 localTime(iso:string){return new Date(Date.parse(iso)+7*3600000).toISOString().slice(0,16);}
 save(){
  const p=this.selected();if(!p)return;this.error.set('');this.reconcile();
  const existing=this.posts().find(x=>x.id===p.id);if(existing&&existing.status!=='scheduled'){this.error.set('Lịch này đã được xử lý hoặc hủy. Đóng cửa sổ và tạo lịch mới từ bản nháp.');return;}
  const at=Date.parse(this.dateTime+':00+07:00');
  if(!Number.isFinite(at)||at<=Date.now()){this.error.set('Chọn ngày giờ trong tương lai (giờ Việt Nam).');return;}
  if(!this.approved){this.error.set('Hãy xác nhận đã kiểm tra nội dung trước khi hẹn giờ.');return;}
  if(!p.title.trim()||!p.outline.trim()){this.error.set('Bản nháp cần có tiêu đề và nội dung.');return;}
  const updated={...p,channel:this.channel,mediaNote:this.mediaNote.trim(),scheduledAt:new Date(at).toISOString()};
  if(this.persist([updated,...this.posts().filter(x=>x.id!==p.id)])){this.selected.set(updated);this.confirmed.set(true);this.feedback.set('Đã lưu lịch mô phỏng. Không đăng lên mạng xã hội.');}
 }
 edit(p:ScheduledPost){this.reconcile();const current=this.posts().find(x=>x.id===p.id);if(!current||current.status!=='scheduled')return;this.open({id:p.draftId},p.source);}
 cancel(p:ScheduledPost){this.reconcile();if(this.persist(this.posts().map(x=>x.id===p.id&&x.status==='scheduled'?{...x,status:'cancelled'}:x)))this.feedback.set('Đã hủy lịch mô phỏng. Bản nháp vẫn được giữ.');}
 close(){this.dialog().nativeElement.close();}
 backdrop(e:MouseEvent){if(e.target===e.currentTarget)this.close();}
 label(status:string){return ({scheduled:'Đã lên lịch',simulated:'Đã mô phỏng đăng',cancelled:'Đã hủy'} as Record<string,string>)[status]||status;}
}
