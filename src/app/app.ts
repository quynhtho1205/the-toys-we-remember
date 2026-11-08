import { Component, signal, inject, computed } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MarTechService } from './services/martech-service';
import { AdminAuth } from './services/admin-auth';
@Component({imports:[RouterOutlet, RouterLink],selector:'app-root',styleUrl:'./app.css',templateUrl:'./app.html'})
export class App {
 readonly auth=inject(AdminAuth);
 private readonly router=inject(Router);
 logout(){this.auth.logout();void this.router.navigateByUrl('/home');}
 protected readonly title = signal('toys_we_remember_micorsite');
 readonly isDemo = signal(false);
 readonly currentPath = signal('/home');
 readonly backPath = computed(() => {
  const previous:Record<string,string> = {'/choose-memory':'/home','/create-memory':'/choose-memory','/memory-card':'/create-memory','/recommended-toys':'/memory-card','/gallery':'/home','/gift-shop':'/memory-card'};
  return this.currentPath()==='/home' ? null : this.currentPath()==='/admin' ? this.campaignPath() : previous[this.currentPath()] || '/home';
 });
 readonly campaignPath = signal(sessionStorage.getItem('ttwr.campaign_path') || '/home');
 private readonly tracking = inject(MarTechService);
 constructor() {
  inject(Router).events.subscribe(event=>{
   if (event instanceof NavigationEnd) {
    const path=event.urlAfterRedirects.split('?')[0];
    this.currentPath.set(path);
    const demo = path === '/admin';
    this.isDemo.set(demo);
    if (!demo && path !== '/login') {
      this.campaignPath.set(event.urlAfterRedirects);
      sessionStorage.setItem('ttwr.campaign_path', event.urlAfterRedirects);
      this.tracking.enterCustomerPage(path);
    }
   }
  });
 }
}
