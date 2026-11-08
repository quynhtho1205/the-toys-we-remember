import {TestBed} from '@angular/core/testing';
import {beforeEach,describe,it,expect} from 'vitest';
import fixture from '../../../public/mock/mykingdom_campaign_mock_400.json';
import {AdminDataSource,MockDataset} from './admin-data-source';
import {FamilyCrm,daysUntilBirthday} from './family-crm';
import {analyze} from './dashboard-analytics';
describe('Family CRM and lifecycle care',()=>{
 let crm:FamilyCrm;let source:AdminDataSource;
 beforeEach(()=>{localStorage.clear();sessionStorage.clear();TestBed.configureTestingModule({});source=TestBed.inject(AdminDataSource);source.mode.set('mock');source.dataset.set(structuredClone(fixture) as unknown as MockDataset);crm=TestBed.inject(FamilyCrm);});
 it('fills missing seeded preferences in older mock profiles and preserves parent edits',()=>{
  const old=structuredClone(crm.data());
  const lu=old.children.find(c=>c.id==='CHV0006-0')!;
  delete lu.favoriteColor;delete lu.favoriteToy;
  const bin=old.children.find(c=>c.id==='CHV0013-0')!;
  bin.favoriteColor='Hồng';bin.favoriteToy='Robot';
  crm.save(old);
  expect(crm.data().children.find(c=>c.id===lu.id)?.favoriteColor).toBe('Xanh dương');
  expect(crm.data().children.find(c=>c.id===lu.id)?.favoriteToy).toBe('Bộ lắp ghép lâu đài');
  expect(crm.data().children.find(c=>c.id===bin.id)?.favoriteColor).toBe('Hồng');
  expect(crm.data().children.find(c=>c.id===bin.id)?.favoriteToy).toBe('Robot');
  source.mode.set('live');expect(crm.data().children).toHaveLength(0);
 });
 it('links all children, consultations and campaign orders to the correct families',()=>{
  expect(crm.data().families).toHaveLength(65);expect(crm.data().children).toHaveLength(82);expect(Object.keys(crm.data().orderLinks)).toHaveLength(14);
  for(const o of crm.orders()){const child=crm.data().children.find(c=>c.id===crm.data().orderLinks[o.id])!;expect(child.familyId).toBe('F'+o.visitorId);}
  expect(analyze(source.events()).revenue).toBe(6297500);
 });
 it('rejects cross-family assignment, retains changes on reload, and isolates live records',()=>{
  const o=crm.orders()[0];const wrong=crm.data().children.find(c=>c.familyId!=='F'+o.visitorId)!;expect(crm.assign(o.id,wrong.id)).toBe(false);
  expect(crm.assign(o.id,'')).toBe(true);expect(crm.data().orderLinks[o.id]).toBeUndefined();
  source.mode.set('live');expect(crm.data().families).toHaveLength(0);source.mode.set('mock');expect(crm.data().orderLinks[o.id]).toBeUndefined();
  expect(JSON.parse(localStorage.getItem('ttwr.crm.v1.mock')!).orderLinks[o.id]).toBeUndefined();
 });
 it('evaluates birthday, old-purchase and consultation rules; disabled rules stop tasks',()=>{
  expect(daysUntilBirthday('2020-01-11',new Date('2026-12-28T00:00:00Z'))).toBe(14);
  expect(crm.tasks().some(t=>t.kind==='birthday')).toBe(true);expect(crm.tasks().some(t=>t.kind==='return')).toBe(true);
  expect(crm.tasks().filter(t=>t.kind==='consult')).toHaveLength(30);
  crm.update(d=>{d.rules={birthday:false};});expect(crm.tasks().some(t=>t.kind==='birthday')).toBe(false);
 });
 it('requires approval and current consent and shares frequency caps with existing automation',()=>{
  const t=crm.tasks().find(t=>crm.admin.consentFor(t.visitorId).granted&&t.kind==='consult')!;expect(t).toBeTruthy();
  const draft=crm.draft(t);crm.simulate(draft);expect(crm.data().runs![0].status).toBe('blocked');
  draft.status='approved';crm.simulate(draft);expect(crm.data().runs![0].status).toBe('simulated');
  crm.simulate(draft);expect(crm.data().runs![0].reason).toContain('1 tin/ngày');
  expect(crm.admin.simulate(t.visitorId,'Lắp ghép').status).toBe('blocked');
  source.withdrawConsent(t.visitorId);crm.simulate(draft);expect(crm.data().runs![0].reason).toContain('consent');
 });
 it('loads 15 distinct consented requests and supplements an older cache without overwriting edits',()=>{
  const rows=crm.data().consultations.filter(c=>c.id.startsWith('ZALO_DEMO_'));
  expect(rows).toHaveLength(15);expect(new Set(rows.map(c=>c.familyId)).size).toBe(15);expect(new Set(rows.map(c=>c.question)).size).toBe(15);
  expect(rows.every(c=>c.consultationConsentAt&&c.preferredTime&&c.contactLabel)).toBe(true);
  expect(rows.filter(c=>c.status==='pending')).toHaveLength(7);expect(rows.filter(c=>c.status==='contacting')).toHaveLength(3);expect(rows.filter(c=>c.status==='resolved')).toHaveLength(5);
  const old=structuredClone(crm.data());old.consultations=old.consultations.filter(c=>!c.id.startsWith('ZALO_DEMO_')||c.id==='ZALO_DEMO_01');old.consultations.find(c=>c.id==='ZALO_DEMO_01')!.note='User edit';crm.save(old);
  expect(crm.data().consultations.filter(c=>c.id.startsWith('ZALO_DEMO_'))).toHaveLength(15);expect(crm.data().consultations.find(c=>c.id==='ZALO_DEMO_01')!.note).toBe('User edit');
  source.mode.set('live');expect(crm.data().consultations).toHaveLength(0);
 });

 it('stores simulated chat per request, requires consent and staff, and preserves completed status',()=>{
  const first=crm.data().consultations.find(c=>c.id==='ZALO_DEMO_01')!;
  expect(crm.sendConsultMessage(first.id,'   ','Minh')).toBe(false);
  expect(crm.sendConsultMessage(first.id,'Chào bạn','Unknown')).toBe(false);
  expect(crm.sendConsultMessage('CONS000','Chào bạn','Minh')).toBe(false);
  expect(crm.sendConsultMessage(first.id,'Chào bạn, mình hỗ trợ chọn bộ lắp ráp nhé.','Vy')).toBe(true);
  const saved=crm.data().consultations.find(c=>c.id===first.id)!;expect(saved.messages).toHaveLength(1);expect(saved.messages![0].sender).toBe('Vy');expect(saved.status).toBe('contacting');expect(saved.acceptedAt).toBeTruthy();
  expect(crm.data().consultations.find(c=>c.id==='ZALO_DEMO_02')!.messages).toBeUndefined();
  expect(crm.sendConsultMessage('ZALO_DEMO_11','Cảm ơn gia đình.','Nga')).toBe(true);expect(crm.data().consultations.find(c=>c.id==='ZALO_DEMO_11')!.status).toBe('resolved');
  source.mode.set('live');expect(crm.data().consultations).toHaveLength(0);
 });

 it('combines existing family stores and routes edits back without losing either source',()=>{
  source.unified.set(true);source.mode.set('mock');
  localStorage.setItem('ttwr.crm.v1.live',JSON.stringify({families:[{id:'NEW',visitorId:'NEW',name:'New parent',owner:''}],children:[],consultations:[{id:'NEW_REQUEST',familyId:'NEW',childId:'',question:'New request',status:'pending',owner:'',createdAt:'2026-11-06T12:00:00Z',note:'',consultationConsentAt:'2026-11-06T12:00:00Z'}],history:[],orderLinks:{}}));window.dispatchEvent(new Event('ttwr:crm-changed'));
  expect(crm.data().families).toHaveLength(66);expect(crm.data().consultations.some(c=>c.id==='NEW_REQUEST')).toBe(true);
  crm.update(d=>{d.consultations.find(c=>c.id==='NEW_REQUEST')!.status='resolved';d.consultations.find(c=>c.id==='ZALO_DEMO_01')!.owner='Vy';});
  expect(JSON.parse(localStorage.getItem('ttwr.crm.v1.live')!).consultations[0].status).toBe('resolved');expect(crm.data().families).toHaveLength(66);expect(crm.data().consultations.find(c=>c.id==='ZALO_DEMO_01')!.owner).toBe('Vy');
 });

});
