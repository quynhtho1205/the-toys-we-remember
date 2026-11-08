import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GiftShop, Recipient, newRecipient } from '../../services/gift-shop';
import { GIFT_CATEGORIES } from '../../services/gift-categories';
import { MarTechService } from '../../services/martech-service';
import { ConsentPrompt } from '../../components/consent-prompt/consent-prompt';
import { RecipientForm } from '../../components/recipient-form/recipient-form';
@Component({selector:'app-gift-shop',imports:[CommonModule,FormsModule,RouterLink,RecipientForm,ConsentPrompt],templateUrl:'./gift-shop.html',styleUrl:'./gift-shop.css'})
export class GiftShopPage implements OnInit {
 readonly shop=inject(GiftShop);private tracking=inject(MarTechService);
 recipient:Recipient=structuredClone(this.shop.recipient());
 consultationConsent=false;branch='suggest';consultName='';consultQuestion='';consultBudget=0;consultPhone='';consultTime='';consultProduct='';requestId='';
 readonly categories=GIFT_CATEGORIES;
 chooseCategory(interest:string){this.recipient={...this.recipient,interests:interest};this.choose('suggest');}
 choose(branch:string){this.apply();this.branch=branch;this.tracking.trackEvent('shop_branch_selected',{branch});}
 consult(product=''){this.consultBudget=this.shop.maxBudget()||this.consultBudget;this.consultProduct=product;this.choose('consult');requestAnimationFrame(()=>document.getElementById('consult-form')?.scrollIntoView({behavior:'smooth',block:'start'}));}
 submitConsult(){if(!this.shop.setRecipient(this.recipient))return;const id=this.shop.requestConsultation({name:this.consultName,question:this.consultQuestion,budget:this.consultBudget,phone:this.consultPhone,time:this.consultTime,product:this.consultProduct,consultationConsent:this.consultationConsent});if(id){this.requestId=id;this.consultPhone='';this.consultationConsent=false;}}
 loginName='';saveForNext=false;voucher='';checkoutOpen=false;receipt:ReturnType<GiftShop['checkout']>=null;message='';checkoutError='';
 ngOnInit(){const saved=this.shop.profiles().find(p=>p.id===this.recipient.id);if(saved)this.selectProfile(saved.id);window.scrollTo({top:0});this.tracking.trackEvent('product_collection_view',{shop_demo:true});}
 openCheckout(){this.checkoutError='';this.checkoutOpen=true;this.receipt=null;requestAnimationFrame(()=>document.getElementById('checkout')?.scrollIntoView({behavior:'smooth',block:'start'}));}
 login(){if(this.shop.login(this.loginName)){this.recipient=structuredClone(this.shop.recipient());this.message='Đã mở tài khoản demo. Chọn hồ sơ đã lưu hoặc tạo hồ sơ mới.';this.saveForNext=false;}}
 logout(){this.shop.logout();this.recipient=newRecipient();this.saveForNext=false;this.checkoutOpen=false;this.receipt=null;}
 selectProfile(id:string){this.recipient=structuredClone(this.shop.profiles().find(p=>p.id===id)||newRecipient());this.shop.setRecipient(this.recipient);this.saveForNext=false;this.message='Đã cập nhật gợi ý theo người nhận.';}
 apply(){if(this.shop.setRecipient(this.recipient))this.message='Đã cập nhật gợi ý cho '+(this.recipient.nickname||'người nhận')+'.';}
 remove(id:string){if(this.shop.removeProfile(id)){this.recipient=structuredClone(this.shop.recipient());this.message='Đã xóa hồ sơ và liên kết cá nhân hóa; lịch sử đơn hàng vẫn được giữ.';}}
 pay(){this.checkoutError='';if(!this.shop.setRecipient(this.recipient)){this.checkoutError=this.shop.error();return;}if(this.voucher.trim()&&!this.shop.discountRate(this.voucher)){this.checkoutError='Mã chưa hợp lệ. Dùng MEMORY15, MYKID-NOSTALGIA-30 hoặc để trống.';return;}this.receipt=this.shop.checkout(this.saveForNext,this.voucher);if(this.receipt){this.checkoutOpen=false;this.recipient=newRecipient();this.saveForNext=false;this.message='Đã tạo đơn mô phỏng. Không có giao dịch thanh toán thực tế.';}else this.checkoutError=this.shop.error();}
}
