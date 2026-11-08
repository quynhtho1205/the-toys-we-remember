import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

@Injectable({providedIn:'root'})
export class AdminAuth {
  readonly signedIn = signal(sessionStorage.getItem('ttwr.admin.session') === 'demo-admin');
  login(username:string,password:string):boolean {
    if(username.trim() !== 'admin' || password !== '123') return false;
    sessionStorage.setItem('ttwr.admin.session','demo-admin');
    this.signedIn.set(true);
    return true;
  }
  logout(){sessionStorage.removeItem('ttwr.admin.session');this.signedIn.set(false);}
}

// Demo navigation gate only: production authorization must be enforced by a server.
export const adminGuard:CanActivateFn = () => inject(AdminAuth).signedIn() || inject(Router).createUrlTree(['/login']);
