import {TestBed} from '@angular/core/testing';
import {provideRouter,Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {routes} from './app.routes';
describe('Readable campaign routes and old shared links',()=>{
 beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});TestBed.configureTestingModule({providers:[provideRouter(routes)]});});
 afterEach(()=>vi.unstubAllGlobals());
 it('redirects old links and preserves acquisition query parameters',async()=>{
  const harness=await RouterTestingHarness.create();const router=TestBed.inject(Router);
  for(const [old,name] of [['page1','home'],['page1-intro','home'],['page2','choose-memory'],['page3','create-memory'],['page4','memory-card'],['page5','gift-shop']]){
   await harness.navigateByUrl('/'+old+'?utm_source=facebook');
   expect(router.url).toBe('/'+name+'?utm_source=facebook');expect(harness.routeNativeElement?.textContent?.trim().length).toBeGreaterThan(0);
  }
 });
 it('opens the landing page from root or an unknown URL',async()=>{
  const harness=await RouterTestingHarness.create('/');expect(TestBed.inject(Router).url).toBe('/home');
  await harness.navigateByUrl('/unknown');expect(TestBed.inject(Router).url).toBe('/home');
 });
});
