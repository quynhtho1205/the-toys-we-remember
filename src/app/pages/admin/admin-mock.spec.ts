import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../../public/mock/mykingdom_campaign_mock_400.json';
import { Admin } from './admin';
import { AdminOperations } from './operations/admin-operations';
import { AdminDataSource } from '../../services/admin-data-source';

describe('Mock JSON visible across all eight Admin sections',()=>{
 beforeEach(()=>{
  localStorage.clear();sessionStorage.clear();
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>structuredClone(fixture)})));
  TestBed.configureTestingModule({imports:[Admin],providers:[provideRouter([{path:'admin',component:Admin}])]});
 });
 afterEach(()=>vi.unstubAllGlobals());
 it('renders all 400 customers and the populated records in each tab',async()=>{
  const harness=await RouterTestingHarness.create('/admin');const source=TestBed.inject(AdminDataSource);
  await vi.waitFor(()=>expect(source.dataset()).not.toBeNull());harness.detectChanges();
  expect(harness.routeNativeElement!.textContent).toContain('400');
  const customers=await harness.navigateByUrl('/admin?tab=customers',Admin);harness.detectChanges();
  expect(customers.stats().visitors).toBe(400);
  const component=()=>harness.routeDebugElement!.query(n=>n.componentInstance instanceof AdminOperations).componentInstance as AdminOperations;
  expect(component().customerRows()).toHaveLength(400);
  component().query.set(fixture.customers[0].display_nickname);harness.detectChanges();expect(component().customerRows()).toHaveLength(1);
  for(const [tab,expected] of [['stories',98],['community',30]] as const){await harness.navigateByUrl('/admin?tab='+tab,Admin);harness.detectChanges();expect(component().storyRows()).toHaveLength(expected);}
  await harness.navigateByUrl('/admin?tab=automation',Admin);harness.detectChanges();expect(component().followupRows().filter(f=>f.status==='delivered')).toHaveLength(46);
  expect(component().abRows().map(r=>[r.leads,r.delivered,r.clicked])).toEqual([[23,23,2],[23,23,4]]);
  await harness.navigateByUrl('/admin?tab=orders',Admin);harness.detectChanges();expect(component().orderRows()).toHaveLength(14);
  await harness.navigateByUrl('/admin?tab=consent',Admin);harness.detectChanges();expect(component().consentStats().map(r=>r.granted)).toEqual([32,9,5]);
  await harness.navigateByUrl('/admin?tab=settings',Admin);harness.detectChanges();expect(component().settingsDraft.name).toBe(fixture.campaign.name);
  expect(component().settingsDraft.themes).toHaveLength(4);
 });
 it('opens the selected story as a modal and closes it without an inline detail panel',async()=>{
  const harness=await RouterTestingHarness.create('/admin?tab=stories');
  await vi.waitFor(()=>expect(TestBed.inject(AdminDataSource).dataset()).not.toBeNull());harness.detectChanges();
  const root=harness.routeNativeElement!;
  const dialog=root.querySelector('dialog[aria-labelledby="story-dialog-title"]') as HTMLDialogElement;
  const show=vi.fn(()=>dialog.setAttribute('open',''));
  Object.defineProperties(dialog,{showModal:{value:show},close:{value:()=>dialog.removeAttribute('open')}});
  const button=[...root.querySelectorAll('button')].find(b=>b.textContent?.includes('Xem câu chuyện & thẻ'))!;
  button.click();harness.detectChanges();
  expect(show).toHaveBeenCalledOnce();expect(dialog.open).toBe(true);
  expect(dialog.textContent).toContain([...fixture.stories].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0].nickname);
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/mock/images/story076-quan-ca-con.png');
  expect(root.querySelector('.detail')?.parentElement).toBe(dialog);
  (dialog.querySelector('button') as HTMLButtonElement).click();harness.detectChanges();
  expect(dialog.open).toBe(false);expect(dialog.querySelector('.detail')).toBeNull();
 });
 it('filters the mock cohort by acquisition channel, device and dates and retains a single combined dataset',async()=>{
  const harness=await RouterTestingHarness.create('/admin');const source=TestBed.inject(AdminDataSource);
  await vi.waitFor(()=>expect(source.dataset()).not.toBeNull());const admin=harness.routeDebugElement!.componentInstance as Admin;
  admin.source.set('facebook');expect(admin.stats().visitors).toBe(180);
  admin.device.set('mobile');expect(admin.stats().visitors).toBe(144);
  admin.reset();admin.device.set('desktop');expect(admin.stats().visitors).toBe(80);
  admin.reset();admin.from.set('2026-12-28');expect(admin.stats().visitors).toBe(0);
  admin.selectData('live');expect(admin.stats().visitors).toBe(400);expect(admin.from()).toBe('');
  admin.selectData('mock');expect(admin.stats().visitors).toBe(400);
  expect(admin.finance()?.total).toBe(3200000);expect(admin.finance()?.roas).toBeCloseTo(2.623958);
 });
});
