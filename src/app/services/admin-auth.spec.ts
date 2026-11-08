import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AdminAuth, adminGuard } from './admin-auth';

describe('Demo admin access',()=>{
  beforeEach(()=>{sessionStorage.clear();TestBed.configureTestingModule({providers:[provideRouter([])]});});
  const guard=()=>TestBed.runInInjectionContext(()=>adminGuard({} as never,{} as never));
  it('redirects direct Admin visits to login until authenticated',()=>{
    expect(TestBed.inject(Router).serializeUrl(guard() as UrlTree)).toBe('/login');
    const auth=TestBed.inject(AdminAuth);
    expect(auth.login('admin','wrong')).toBe(false);
    expect(auth.login('guest','123')).toBe(false);
    expect(auth.signedIn()).toBe(false);
    expect(auth.login('admin','123')).toBe(true);
    expect(guard()).toBe(true);
  });
  it('restores the tab session and revokes access on logout without deleting campaign data',()=>{
    const auth=TestBed.inject(AdminAuth);auth.login('admin','123');
    expect(new AdminAuth().signedIn()).toBe(true);
    sessionStorage.setItem('ttwr.campaign_path','/gallery');
    auth.logout();
    expect(new AdminAuth().signedIn()).toBe(false);
    expect(guard()).toBeInstanceOf(UrlTree);
    expect(sessionStorage.getItem('ttwr.campaign_path')).toBe('/gallery');
  });
});
