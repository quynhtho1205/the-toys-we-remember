import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../../public/mock/mykingdom_campaign_mock_400.json';
import { AdminDataSource, MockDataset } from './admin-data-source';
import { CampaignAdminStore } from './campaign-admin-store';
import { MarTechService } from './martech-service';
import { analyze } from './dashboard-analytics';
import { MemoryThemeId } from '../models/martech-events.model';

describe('400 customer Admin data adapter',()=>{
 let source:AdminDataSource;let live:MarTechService;let store:CampaignAdminStore;
 beforeEach(()=>{
  localStorage.clear();sessionStorage.clear();TestBed.configureTestingModule({});
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>structuredClone(fixture)})));
  source=TestBed.inject(AdminDataSource);live=TestBed.inject(MarTechService);store=TestBed.inject(CampaignAdminStore);
 });
 afterEach(()=>vi.unstubAllGlobals());
 async function load(){source.select('mock');await vi.waitFor(()=>expect(source.dataset()).not.toBeNull());}
 it('computes all agreed funnel counts, revenue and consent from the real JSON fixture',async()=>{
  source.activate();await vi.waitFor(()=>expect(source.dataset()).not.toBeNull());
  const s=analyze(source.events());
  expect(source.mode()).toBe('mock');expect(s.visitors).toBe(400);expect(s.sessions).toBe(539);
  expect(s.stories).toBe(98);expect(s.cards).toBe(93);expect(s.lead).toBe(46);expect(s.mql).toBe(25);expect(s.sql).toBe(14);
  expect(s.customers).toBe(14);expect(s.qualifiedCustomers).toBe(8);expect(s.outsideCustomers).toBe(6);
  expect(s.revenue).toBe(6297500);expect(s.orders).toBe(14);expect(s.sqlRate).toBeCloseTo(57.142857);
  expect(Object.fromEntries(s.channels.map(c=>[c.label,c.value]))).toEqual({facebook:180,tiktok:120,youtube:40,zalo:40,direct:20});
  expect(s.consentRows.map(r=>[r.shown,r.granted])).toEqual([[93,32],[35,9],[20,5]]);
  expect(store.stories()).toHaveLength(98);expect(store.stories().filter(s=>s.submitted)).toHaveLength(30);
  expect(store.vouchers()).toHaveLength(3);expect(store.settings().themes).toHaveLength(4);
 });
 it('isolates mock edits and preserves live events, cards, notes, consent and settings',async()=>{
  live.grantConsent('create','live-impression','email');
  const liveCard=store.captureStory({nickname:'Live',periodYear:'2000',eraCategory:'2000s',storyText:'Một câu chuyện trực tiếp',photoUrl:null,theme_id:MemoryThemeId.GACH_LEGO},false)!;
  store.saveNote({visitorId:'live-person',owner:'Live owner',note:'Live note',updatedAt:new Date().toISOString()});
  const before=JSON.stringify(live.events());const consent=localStorage.getItem('ttwr.consent');
  await load();
  const pending=store.stories().find(s=>s.submitted&&s.status==='pending')!;
  store.moderate(pending.id,'approved');store.saveNote({visitorId:'V0001',owner:'Mock owner',note:'Mock note',updatedAt:'2026-12-28T00:00:00+07:00'});
  expect(source.withdrawConsent(fixture.customers.find(c=>c.marketing_consent_status==='granted')!.visitor_id)).toBe(true);
  expect(JSON.stringify(live.events())).toBe(before);expect(localStorage.getItem('ttwr.consent')).toBe(consent);
  expect(localStorage.getItem('ttwr.story.'+pending.id)).toBeNull();
  source.select('live');expect(store.stories()).toHaveLength(1);expect(store.stories()[0].id).toBe(liveCard.id);
  expect(store.notes()).toHaveLength(1);expect(store.notes()[0].owner).toBe('Live owner');expect(live.consentGranted()).toBe(true);
 });
 it('always captures Marketing stories into live storage while Admin is viewing mock data',async()=>{
  await load();const s=store.captureStory({nickname:'Live from Campaign',periodYear:'1998',eraCategory:'90s',storyText:'Nội dung từ microsite',photoUrl:null,theme_id:MemoryThemeId.GACH_LEGO},true)!;
  expect(store.stories()).toHaveLength(98);expect(localStorage.getItem('ttwr.story.'+s.id)).not.toBeNull();
  source.select('live');expect(store.stories().some(s=>s.nickname==='Live from Campaign')).toBe(true);
 });
 it('does not duplicate records on reload and retains only separate mock overrides',async()=>{
  await load();const original=source.events().length;
  source.withdrawConsent(fixture.customers.find(c=>c.marketing_consent_status==='granted')!.visitor_id);
  await source.load();await source.load();
  expect(source.customers()).toHaveLength(400);expect(source.events()).toHaveLength(original+1);
  expect(new Set(source.events().map(e=>e.event_id)).size).toBe(original+1);
  expect(Object.keys(localStorage).filter(k=>k.startsWith('ttwr.event.'))).toHaveLength(0);
 });
 it('shows a recoverable load error then retries successfully',async()=>{
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));source.select('mock');
  await vi.waitFor(()=>expect(source.error()).not.toBe(''));expect(source.dataset()).toBeNull();
  await source.load();expect(source.error()).toBe('');expect(source.dataset()?.customers).toHaveLength(400);
 });
 it('rejects a malformed cohort instead of displaying incomplete numbers',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce({ok:true,json:async()=>({...fixture,customers:fixture.customers.slice(0,10)})} as Response);
  source.select('mock');await vi.waitFor(()=>expect(source.error()).not.toBe(''));expect(source.dataset()).toBeNull();
 });
 it('combines the 400 seed customers with new actions without duplication and preserves customer records',async()=>{
  source.activate();await vi.waitFor(()=>expect(source.dataset()).not.toBeNull());
  expect(source.customers()).toHaveLength(400);
  live.trackEvent('session_start');expect(source.customers()).toHaveLength(401);expect(analyze(source.events()).visitors).toBe(401);
  live.trackEvent('product_collection_view');expect(source.customers()).toHaveLength(401);
  const story=store.captureStory({nickname:'Khách mới',periodYear:'2000',eraCategory:'00s',storyText:'Ký ức mới',photoUrl:null,theme_id:MemoryThemeId.GACH_LEGO},true)!;
  expect(store.stories()).toHaveLength(99);store.moderate(story.id,'approved');expect(store.campaignStories().find(s=>s.id===story.id)?.status).toBe('approved');
  await source.load();expect(source.customers()).toHaveLength(401);expect(store.stories()).toHaveLength(99);source.select('live');expect(source.mode()).toBe('mock');
 });

});
