import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuth } from '../../services/admin-auth';

@Component({
  selector:'app-admin-login',imports:[FormsModule,RouterLink],
  template:`<main class="login-page"><section aria-labelledby="login-title">
    <a class="back" routerLink="/home">← Về trang chủ</a>
    <span class="eyebrow">MYKINGDOM · QUẢN TRỊ CAMPAIGN</span>
    <h1 id="login-title">Đăng nhập Admin</h1>
    <p>Đăng nhập để quản lý chiến dịch và xem dữ liệu.</p>
    <form (ngSubmit)="submit()">
      <label for="admin-username">Tên đăng nhập</label>
      <input id="admin-username" name="username" autocomplete="username" [(ngModel)]="username" required>
      <label for="admin-password">Mật khẩu</label>
      <input id="admin-password" name="password" type="password" autocomplete="current-password" [(ngModel)]="password" required>
      @if(error){<p class="error" role="alert">{{error}}</p>}
      <button type="submit">Đăng nhập →</button>
    </form>
    <p class="note">Đăng nhập demo, chỉ dùng để truy cập giao diện quản trị trên trình duyệt này.</p>
  </section></main>`,
  styles:[`:host{display:block}.login-page{min-height:calc(100dvh - 52px);display:grid;place-items:center;padding:40px 20px;background:#fffbea;color:#111;font-family:'Space Grotesk',Arial,sans-serif;box-sizing:border-box}section{width:100%;max-width:450px;background:#fffdf0;border:3px solid #111;box-shadow:7px 7px 0 #111;padding:32px;box-sizing:border-box}.back{display:inline-block;color:#111;margin-bottom:28px;font-weight:700}.eyebrow{display:block;font-size:11px;letter-spacing:1px;font-weight:700}h1{font-size:32px;line-height:1.2;margin:14px 0}p{line-height:1.6;color:#5c5148}form{display:grid;gap:10px;margin-top:24px}label{font-weight:700}input{font:inherit;padding:12px;border:2px solid #111;background:#fff;min-width:0;margin-bottom:10px;border-radius:0}button{font:700 16px 'Space Grotesk',Arial,sans-serif;padding:14px;background:#ffd600;border:2px solid #111;box-shadow:3px 3px 0 #111;cursor:pointer}button:hover{background:#ffe957}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #0064e9;outline-offset:3px}.error{color:#b52121;margin:0 0 8px}.note{font-size:12px;margin:24px 0 0}@media(max-width:480px){section{padding:24px}h1{font-size:28px}}`]
})
export class AdminLogin {
  username='';password='';error='';
  private readonly auth=inject(AdminAuth);
  private readonly router=inject(Router);
  submit(){
    if(!this.auth.login(this.username,this.password)){this.error='Tên đăng nhập hoặc mật khẩu chưa đúng.';return;}
    this.password='';this.error='';void this.router.navigateByUrl('/admin');
  }
}
