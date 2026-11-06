import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Admin } from '../admin';
import { AdminOperations } from './admin-operations';
import { MarTechService } from '../../../services/martech-service';
import { CampaignAdminStore } from '../../../services/campaign-admin-store';
import { MemoryThemeId } from '../../../models/martech-events.model';
describe('Grouped Admin workspace',()=>{
 beforeEach(()=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('ttwr.admin.source','live');vi.spyOn(window,'scrollTo').mockImplementation(()=>{});TestBed.configureTestingModule({imports:[Admin,AdminOperations],providers:[provideRouter([{path:'admin',component:Admin}])]});});
 it('supports all eleven direct links and marks the selected section',async()=>{
  const harness=await RouterTestingHarness.create('/admin?tab=customers');
  for(const tab of ['overview','customers','families','consultation','stories','community','automation','livestream','orders','consent','settings']){
   const admin=await harness.navigateByUrl('/admin?tab='+tab,Admin);
   expect(admin.activeTab()).toBe(tab);
   expect(harness.routeNativeElement!.querySelectorAll('nav[aria-label="Các mục quản trị"] a')).toHaveLength(6);
   expect(harness.routeNativeElement!.querySelector('nav a.active')?.getAttribute('aria-current')).toBe('page');
   expect(harness.routeNativeElement!.querySelector('h1')?.textContent).toContain(admin.currentTab().name);
  }
 });
 it('shows captured story content and approved UGC in the correct sections',()=>{
  const store=TestBed.inject(CampaignAdminStore);const tracking=TestBed.inject(MarTechService);
  const story=store.captureStory({nickname:'Bé Mây',periodYear:'1998',eraCategory:'90s',storyText:'Chiều hè xếp gạch cùng bạn.',photoUrl:null,theme_id:MemoryThemeId.GACH_LEGO},true)!;
  tracking.trackEvent('story_submit_success',{story_id:story.id});
  const fixture=TestBed.createComponent(AdminOperations);
  fixture.componentRef.setInput('events',tracking.events());fixture.componentRef.setInput('tab','stories');fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Bé Mây');
  fixture.componentRef.setInput('tab','community');fixture.detectChanges();
  const approve=[...fixture.nativeElement.querySelectorAll('button')].find((b:any)=>b.textContent.trim()==='Duyệt') as HTMLButtonElement;
  approve.click();fixture.detectChanges();expect(store.stories()[0].status).toBe('approved');
  expect(fixture.nativeElement.textContent).toContain('Đã duyệt');
 });
 it('limits consent confirmations to the supplied measurement history',()=>{
  const tracking=TestBed.inject(MarTechService);
  const shown=tracking.trackEvent('marketing_consent_shown',{consent_source:'create',consent_impression_id:'x'});
  tracking.grantConsent('create','x','email');
  const fixture=TestBed.createComponent(AdminOperations);
  fixture.componentRef.setInput('tab','consent');fixture.componentRef.setInput('events',[shown]);fixture.componentRef.setInput('history',[shown]);fixture.detectChanges();
  expect(fixture.componentInstance.consentStats()[0].granted).toBe(0);
 });
 it('does not include an older story merely because it shares the same session',()=>{
  const store=TestBed.inject(CampaignAdminStore);const tracking=TestBed.inject(MarTechService);
  const data={nickname:'Trước',periodYear:'1998',eraCategory:'90s',storyText:'Câu chuyện trước',photoUrl:null,theme_id:MemoryThemeId.GACH_LEGO};
  store.captureStory(data,false);
  const newer=store.captureStory({...data,nickname:'Sau'},true)!;
  const event=tracking.trackEvent('story_submit_success',{story_id:newer.id});
  const fixture=TestBed.createComponent(AdminOperations);fixture.componentRef.setInput('tab','stories');fixture.componentRef.setInput('events',[event]);fixture.detectChanges();
  expect(fixture.componentInstance.visibleStories().map(s=>s.nickname)).toEqual(['Sau']);
 });
 it('saves a selected customer note and renders it when reopened',()=>{
  const tracking=TestBed.inject(MarTechService);tracking.grantConsent('create','x','email');
  const fixture=TestBed.createComponent(AdminOperations);fixture.componentRef.setInput('events',tracking.events());fixture.detectChanges();
  const ops=fixture.componentInstance;ops.openCustomer(ops.customers()[0]);ops.noteOwner='Team Tech';ops.noteText='Tư vấn bộ lắp ghép';ops.saveNote();
  ops.openCustomer(ops.customers()[0]);expect(ops.noteText).toBe('Tư vấn bộ lắp ghép');expect(ops.noteOwner).toBe('Team Tech');
 });
 it('shows ten trial customers, expands by ten and collapses independently',()=>{
  const fixture=TestBed.createComponent(AdminOperations);fixture.componentRef.setInput('tab','automation');
  const ops=fixture.componentInstance;
  const customers=Array.from({length:23},(_,i)=>({id:'V'+i,stage:'Lead',theme:'',contactType:'email',consent:true,group:'A'}));
  vi.spyOn(ops,'eligibleCustomers').mockReturnValue(customers as any);
  fixture.changeDetectorRef.markForCheck();
  fixture.detectChanges();
  const section=[...fixture.nativeElement.querySelectorAll('section')].find((s:any)=>s.querySelector('h2')?.textContent==='Chạy thử tin chăm sóc') as HTMLElement;
  const click=(label:string)=>{(Array.from(section.querySelectorAll('button')).find(b=>b.textContent?.trim()===label)!).click();fixture.detectChanges();};
  expect(section.querySelectorAll('tbody tr')).toHaveLength(10);
  click('Xem thêm 10');expect(section.querySelectorAll('tbody tr')).toHaveLength(20);
  click('Xem thêm 3');expect(section.querySelectorAll('tbody tr')).toHaveLength(23);
  expect(ops.followupLimit()).toBe(10);expect(ops.runLimit()).toBe(10);
  click('Thu gọn');expect(section.querySelectorAll('tbody tr')).toHaveLength(10);
 });

});
