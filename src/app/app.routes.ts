import { Routes } from '@angular/router';
import { Page1IntroComponent } from './pages/page1-intro/page1-intro';
import { Page2Select } from './pages/page2-select/page2-select';
import { Page3Create } from './pages/page3-create/page3-create';
import { adminGuard } from './services/admin-auth';

export const routes: Routes = [
 {path:'admin',canActivate:[adminGuard],loadComponent:()=>import('./pages/admin/admin').then(m=>m.Admin)},
 {path:'login',loadComponent:()=>import('./pages/admin-login/admin-login').then(m=>m.AdminLogin)},
 {path:'',redirectTo:'home',pathMatch:'full'},
 {path:'home',component:Page1IntroComponent},
 {path:'choose-memory',component:Page2Select},
 {path:'create-memory',component:Page3Create},
 {path:'memory-card',loadComponent:()=>import('./pages/page4-memory/page4-memory').then(m=>m.Page4Memory)},
 {path:'recommended-toys',redirectTo:'gift-shop',pathMatch:'full'},
 {path:'gift-shop',loadComponent:()=>import('./pages/gift-shop/gift-shop').then(m=>m.GiftShopPage)},
 {path:'gallery',loadComponent:()=>import('./pages/community-gallery/community-gallery').then(m=>m.CommunityGalleryComponent)},
 // Keep old shared links working.
 {path:'page1',redirectTo:'home',pathMatch:'full'},
 {path:'page1-intro',redirectTo:'home',pathMatch:'full'},
 {path:'page2',redirectTo:'choose-memory',pathMatch:'full'},
 {path:'page3',redirectTo:'create-memory',pathMatch:'full'},
 {path:'page4',redirectTo:'memory-card',pathMatch:'full'},
 {path:'page5',redirectTo:'gift-shop',pathMatch:'full'},
 {path:'**',redirectTo:'home'},
];
