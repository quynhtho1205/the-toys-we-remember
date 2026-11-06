import { AfterViewInit, Component, ElementRef, Input, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConsentSource, MarTechService } from '../../services/martech-service';
@Component({
 selector: 'app-consent-prompt', imports: [FormsModule],
 template: `@if (!tracking.consentGranted() && !dismissed) {
 <section class="consent-box"><h3>Tiếp nối ký ức cùng MyKingdom</h3>
 <p>Bạn vẫn nhận thẻ và khám phá đồ chơi khi bỏ qua bước này.</p>
 <p>Nhận gợi ý và ưu đãi qua Zalo · Không bắt buộc.</p>
 <label>{{contactType === 'email' ? 'Email' : 'Số điện thoại Zalo'}} <input [(ngModel)]="contact" [type]="contactType === 'email' ? 'email' : 'tel'" autocomplete="off"></label>
 <label class="check"><input type="checkbox" [(ngModel)]="agreed"> Tôi đồng ý nhận gợi ý đồ chơi và ưu đãi từ MyKingdom qua Zalo. Có thể hủy bất kỳ lúc nào.</label>
 <small>Demo chỉ kiểm tra định dạng liên hệ; không lưu số điện thoại hoặc email.</small>
 @if (error) { <p role="alert">{{error}}</p> }
 <div><button (click)="confirm()">Xác nhận</button><button class="skip" (click)="skip()">Bỏ qua</button></div>
 </section> }`,
 styles: [`.consent-box{background:#fffdf0;border:2px solid #222;padding:24px;margin:24px auto;max-width:680px;color:#222;font:15px/1.6 Arial,sans-serif}.consent-box h3{font-size:22px;font-weight:700}.consent-box label{display:block;margin:12px 0}.consent-box input:not([type=checkbox]),select{display:block;width:100%;border:1px solid #aaa;padding:10px;background:white}.check{display:flex!important;gap:10px;align-items:start}.check input{margin-top:6px}small{display:block;color:#666}button{background:#20251f;color:white;padding:10px 18px;margin:14px 10px 0 0;border-radius:5px}.skip{background:#eee;color:#222}`]
})
export class ConsentPrompt implements AfterViewInit, OnDestroy {
 @Input() source: ConsentSource = 'create';
 readonly tracking = inject(MarTechService);
 private host = inject(ElementRef);
 private observer?: IntersectionObserver;
 private impressionId = '';
 contactType = 'zalo'; contact = ''; agreed = false; dismissed = false; error = '';
 ngAfterViewInit() {
   this.observer = new IntersectionObserver(entries => {
     if (entries.some(e=>e.isIntersecting && e.intersectionRatio >= .5) && !this.impressionId && !this.tracking.consentGranted()) {
       this.impressionId = crypto.randomUUID();
       this.tracking.trackEvent('marketing_consent_shown',{consent_source:this.source,consent_impression_id:this.impressionId});
     }
   },{threshold:.5});
   const panel = this.host.nativeElement.querySelector('section');
   if (panel) this.observer.observe(panel);
 }
 confirm() {
   const valid = this.contactType === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contact.trim()) : /^(\+84|0)\d{9}$/.test(this.contact.trim());
   if (!this.agreed || !valid) { this.error = 'Vui lòng nhập liên hệ hợp lệ và chọn đồng ý, hoặc bấm Bỏ qua.'; return; }
   if (!this.impressionId) return;
   this.tracking.grantConsent(this.source,this.impressionId,this.contactType);
   this.contact = '';
 }
 skip() {
   if (this.impressionId) this.tracking.trackEvent('marketing_consent_declined',{consent_source:this.source,consent_impression_id:this.impressionId});
   this.dismissed = true;
 }
 ngOnDestroy() { this.observer?.disconnect(); }
}
