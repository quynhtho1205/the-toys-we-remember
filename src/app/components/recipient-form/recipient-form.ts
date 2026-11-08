import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Recipient, newRecipient } from '../../services/gift-shop';
@Component({selector:'app-recipient-form',imports:[FormsModule],template:`
<div class="recipient-fields">
 @if(showKind){<label>Người nhận<select [(ngModel)]="recipient.kind"><option value="self">Cho bản thân</option><option value="child">Chơi cùng con</option><option value="other">Tặng người khác</option></select></label>}
 @if(!compact){<label>Tên / nickname<input [(ngModel)]="recipient.nickname" maxlength="80" placeholder="Có thể bỏ qua"></label>}
 <label>Nhóm tuổi<select [(ngModel)]="recipient.ageBand"><option value="">Chưa cung cấp</option><option value="0–2">0–2 tuổi</option><option value="3–5">3–5 tuổi</option><option value="6–8">6–8 tuổi</option><option value="9–12">9–12 tuổi</option><option value="13+">13 tuổi trở lên / người lớn</option></select></label>
 <label>Sở thích<input [(ngModel)]="recipient.interests" maxlength="200" placeholder="Ví dụ: lắp ghép, kể chuyện, ngoài trời"></label>
 @if(compact){<details><summary>Thêm thông tin người nhận</summary><label>Tên / nickname<input [(ngModel)]="recipient.nickname" maxlength="80" placeholder="Có thể bỏ qua"></label><label>Màu sắc yêu thích<input [(ngModel)]="recipient.color" maxlength="80" placeholder="Ví dụ: xanh, hồng"></label><label>Đồ chơi yêu thích<input [(ngModel)]="recipient.favoriteToy" maxlength="150" placeholder="Ví dụ: xe đua, gấu bông"></label></details>}
 @else{<label>Màu sắc yêu thích<input [(ngModel)]="recipient.color" maxlength="80" placeholder="Ví dụ: xanh, hồng"></label><label>Đồ chơi yêu thích<input [(ngModel)]="recipient.favoriteToy" maxlength="150" placeholder="Ví dụ: gấu bông, xe, cờ"></label>}
</div>
@if(compact){<p class="gift-hint">Thông tin tùy chọn, chỉ lưu khi bạn đồng ý.</p>}
@else{<p class="gift-hint">Tất cả thông tin đều tùy chọn. Thông tin dùng để gợi ý trong lần này; được lưu kèm yêu cầu nếu bạn gửi tư vấn, hoặc lưu cho lần mua sau khi bạn đồng ý tại thanh toán. Không tự đăng ký nhận quảng cáo.</p>}

`})
export class RecipientForm {@Input() showKind=true;@Input() compact=false;@Input() recipient:Recipient=newRecipient();}
