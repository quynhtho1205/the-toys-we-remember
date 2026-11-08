import { TestBed } from '@angular/core/testing';
import { beforeEach, expect, it } from 'vitest';
import { GiftShop, newRecipient } from './gift-shop';
import { MarTechService } from './martech-service';
import { FamilyCrm } from './family-crm';
import { AdminDataSource } from './admin-data-source';
beforeEach(()=>{localStorage.clear();sessionStorage.clear();TestBed.configureTestingModule({});});
it('permits guest checkout with no optional fields, never saves a profile and prevents a duplicate empty checkout',()=>{
 const shop=TestBed.inject(GiftShop);shop.add('GIFT01');const order=shop.checkout(false,'MEMORY15');
 expect(order?.total).toBe(339150);expect(shop.profiles()).toHaveLength(0);expect(localStorage.getItem('ttwr.gifts.v1')).toBeNull();
 expect(shop.checkout(false,'')).toBeNull();const purchases=TestBed.inject(MarTechService).events().filter(e=>e.event_name==='purchase');expect(purchases).toHaveLength(1);expect(purchases[0]['shop_demo']).toBe(true);expect(purchases[0]['campaign_attributed']).not.toBe(true);
});
it('saves consented child preferences to the parent account and live CRM, restores on login and links repeat purchases',()=>{
 const shop=TestBed.inject(GiftShop),crm=TestBed.inject(FamilyCrm);TestBed.inject(AdminDataSource).mode.set('live');
 expect(shop.login('Nhà Bắp')).toBe(true);shop.setRecipient({...newRecipient(),nickname:'Bé Sóc',ageBand:'6–8',interests:'xe lắp ghép',color:'đỏ',favoriteToy:'tàu'});shop.add('GIFT06');const first=shop.checkout(true,'');expect(first).not.toBeNull();expect(shop.profiles()[0].consentAt).toBeTruthy();const profile=shop.profiles()[0];
 expect(crm.data().children[0].nickname).toBe('Bé Sóc');expect(crm.data().children[0].favoriteColor).toBe('đỏ');expect(crm.data().orderLinks[first!.id]).toBe(profile.id);expect(TestBed.inject(MarTechService).consentGranted()).toBe(false);
 shop.logout();expect(shop.profiles()).toHaveLength(0);shop.login('Nhà Bắp');expect(shop.profiles()).toHaveLength(1);shop.setRecipient(shop.profiles()[0]);expect(shop.recommendations()[0].id).toBe('GIFT06');shop.add('GIFT06');const second=shop.checkout(false,'');expect(crm.data().orderLinks[second!.id]).toBe(profile.id);
 shop.removeProfile(profile.id);expect(shop.profiles()).toHaveLength(0);expect(crm.data().children).toHaveLength(0);expect(Object.values(crm.data().orderLinks)).not.toContain(profile.id);
});
it('keeps accounts isolated and refuses saving without consent',()=>{
 const shop=TestBed.inject(GiftShop);shop.login('Nhà An');expect(shop.saveProfile({...newRecipient(),nickname:'Bé An'},false)).toBeNull();expect(shop.profiles()).toHaveLength(0);shop.saveProfile({...newRecipient(),nickname:'Bé An'},true);shop.logout();shop.login('Nhà Bình');expect(shop.profiles()).toHaveLength(0);expect(shop.recipient().nickname).toBe('');
});
it('uses optional age as a filter and interests to rank, without inventing recommendations for unsupported ages',()=>{
 const shop=TestBed.inject(GiftShop);shop.setRecipient({...newRecipient(),ageBand:'3–5',interests:'búp bê',color:'hồng'});expect(shop.recommendations()[0].id).toBe('GIFT03');expect(shop.recommendations().some(p=>p.id==='GIFT06')).toBe(false);shop.setRecipient({...newRecipient(),ageBand:'0–2'});expect(shop.recommendations()).toHaveLength(0);
});

it('keeps saved gift profiles out of marketing automation and supports the card voucher',()=>{
 const shop=TestBed.inject(GiftShop),crm=TestBed.inject(FamilyCrm);shop.login('Gift-only consent');shop.setRecipient({...newRecipient(),nickname:'Bắp',ageBand:'6–8'});shop.add('GIFT01');const order=shop.checkout(true,'MYKID-NOSTALGIA-30');expect(order?.total).toBe(279300);expect(crm.tasks()).toHaveLength(0);expect(TestBed.inject(MarTechService).consentGranted()).toBe(false);
});

it('scopes demo orders to the correct parent account on the same browser',()=>{
 const shop=TestBed.inject(GiftShop),crm=TestBed.inject(FamilyCrm);shop.login('Nhà Một');shop.setRecipient({...newRecipient(),nickname:'Con Một'});shop.add('GIFT01');shop.checkout(true,'');shop.logout();shop.login('Nhà Hai');shop.setRecipient({...newRecipient(),nickname:'Con Hai'});shop.add('GIFT02');shop.checkout(true,'');
 const families=crm.data().families;expect(families).toHaveLength(2);for(const f of families)expect(crm.orders().filter(o=>crm.belongsToFamily(o,f))).toHaveLength(1);
});

it('reflects Admin edits to saved child preferences when the shopper selects the profile again',()=>{
 const shop=TestBed.inject(GiftShop),crm=TestBed.inject(FamilyCrm);shop.login('Gia đình');const p=shop.saveProfile({...newRecipient(),nickname:'Bắp'},true)!;crm.update(d=>{const c=d.children.find(c=>c.id===p.id)!;c.nickname='Bắp Nhỏ';c.favoriteColor='xanh';c.interests='ngoài trời';});expect(shop.profiles()[0].nickname).toBe('Bắp Nhỏ');expect(shop.profiles()[0].color).toBe('xanh');shop.setRecipient(shop.profiles()[0]);expect(shop.recommendations()[0].id).toBe('GIFT05');
});

it('filters by budget while preserving age eligibility',()=>{const shop=TestBed.inject(GiftShop);shop.setRecipient({...newRecipient(),ageBand:'6–8',interests:'lắp ghép'});shop.maxBudget.set(300000);expect(shop.recommendations().length).toBeGreaterThan(0);expect(shop.recommendations().every(p=>p.price<=300000&&p.ages.includes('6–8'))).toBe(true);});
it('hands a customer request to live CRM without granting marketing consent or storing a raw phone',()=>{const shop=TestBed.inject(GiftShop),crm=TestBed.inject(FamilyCrm);TestBed.inject(AdminDataSource).mode.set('live');shop.setRecipient({...newRecipient(),ageBand:'6–8',interests:'lắp ghép'});const id=shop.requestConsultation({name:'Nhà Demo',question:'Tìm quà',budget:500000,phone:'0900000000',time:'Sau 18h',product:'Hộp gạch',consultationConsent:true});expect(id).toBeTruthy();expect(crm.data().consultations[0].id).toBe(id);expect(crm.data().consultations[0].preferredTime).toBe('Sau 18h');expect(localStorage.getItem('ttwr.crm.v1.live')).not.toContain('0900000000');expect(TestBed.inject(MarTechService).consentGranted()).toBe(false);expect(crm.tasks().some(t=>t.kind==='consult')).toBe(true);});
it('rejects incomplete consultation requests without creating CRM data',()=>{const shop=TestBed.inject(GiftShop);expect(shop.requestConsultation({name:'',question:'',budget:-1,phone:'abc',time:'',product:'',consultationConsent:true})).toBeNull();expect(localStorage.getItem('ttwr.crm.v1.live')).toBeNull();});

it('requires separate consultation consent before accepting a valid request',()=>{const shop=TestBed.inject(GiftShop);expect(shop.requestConsultation({name:'Demo',question:'Tìm quà',budget:500000,phone:'0900000000',time:'Sau 18h',product:'',consultationConsent:false})).toBeNull();expect(localStorage.getItem('ttwr.crm.v1.live')).toBeNull();});

it('shows nine distinct racing products for the demo interest, respecting age and budget',()=>{
 const shop=TestBed.inject(GiftShop);
 shop.setRecipient({...newRecipient(),ageBand:'6–8',interests:'Em thích xe đua'});
 const products=shop.recommendations();
 expect(products).toHaveLength(9);
 expect(new Set(products.map(p=>p.imageUrl)).size).toBe(9);
 expect(products.every(p=>p.collection==='racing'&&p.imageUrl&&p.reasons.some(r=>r.includes('xe đua')))).toBe(true);
 shop.maxBudget.set(300000);
 expect(shop.recommendations()).toHaveLength(4);
 expect(shop.recommendations().every(p=>p.price<=300000)).toBe(true);
 shop.setRecipient({...newRecipient(),ageBand:'0–2',interests:'xe đua'});
 expect(shop.recommendations()).toHaveLength(0);
 shop.maxBudget.set(0);shop.setRecipient({...newRecipient(),favoriteToy:'XE ĐUA F1'});
 expect(shop.recommendations()).toHaveLength(9);
 shop.setRecipient({...newRecipient(),interests:'búp bê'});
 expect(shop.recommendations()[0].id).toBe('GIFT03');
});
it('includes a racing item in demo checkout at the actual catalog price',()=>{
 const shop=TestBed.inject(GiftShop);shop.add('RACE01');shop.add('RACE08');
 expect(shop.subtotal()).toBe(728000);
 const order=shop.checkout(false,'MEMORY15');
 expect(order?.total).toBe(618800);
 expect(shop.cartRows()).toHaveLength(0);
 expect(shop.profiles()).toHaveLength(0);
});
