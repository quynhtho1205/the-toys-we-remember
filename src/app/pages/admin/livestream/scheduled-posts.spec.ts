import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ScheduledPosts, ScheduledPost } from './scheduled-posts';

describe('Demo publishing schedule',()=>{
 beforeEach(()=>{localStorage.clear();vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-06T05:00:00Z'));TestBed.configureTestingModule({imports:[ScheduledPosts]});});
 afterEach(()=>{TestBed.resetTestingModule();vi.useRealTimers();});
 function setup(){const fixture=TestBed.createComponent(ScheduledPosts);fixture.detectChanges();return fixture.componentInstance;}
 function post():ScheduledPost{return {id:'p1',draftId:'d1',source:'gallery',mode:'mock',title:'Bài thử',hook:'Mở đầu',outline:'Nội dung đã duyệt',cta:'Kể chuyện',visualDirection:'Ảnh 4:5',format:'post',channel:'Facebook',mediaNote:'',scheduledAt:'2026-11-06T06:00:00Z',createdAt:'2026-11-06T05:00:00Z',status:'scheduled'};}
 it('requires approval and a future Vietnam time, and stores a content snapshot',()=>{
  const c=setup();c.selected.set(post());c.dateTime='2026-11-06T13:00';c.save();expect(c.posts()).toHaveLength(0);expect(c.error()).toContain('xác nhận');
  c.approved=true;c.dateTime='2026-11-06T11:59';c.save();expect(c.posts()).toHaveLength(0);
  c.dateTime='2026-11-06T13:00';c.save();expect(c.posts()[0].scheduledAt).toBe('2026-11-06T06:00:00.000Z');expect(c.posts()[0].visualDirection).toBe('Ảnh 4:5');expect(c.confirmed()).toBe(true);
 });
 it('updates a schedule without duplicating it and respects the new due time',()=>{
  const c=setup();c.selected.set(post());c.approved=true;c.dateTime='2026-11-06T13:00';c.save();c.dateTime='2026-11-06T14:00';c.save();expect(c.posts()).toHaveLength(1);
  c.reconcile(Date.parse('2026-11-06T06:30:00Z'));expect(c.posts()[0].status).toBe('scheduled');
  c.reconcile(Date.parse('2026-11-06T07:00:00Z'));expect(c.posts()[0].status).toBe('simulated');
 });
 it('processes overdue schedules on reopening and does not process cancelled ones',()=>{
  localStorage.setItem('ttwr.content.schedules.v1',JSON.stringify([{...post(),scheduledAt:'2026-11-06T04:00:00Z'},{...post(),id:'p2',status:'cancelled'}]));
  const c=setup();expect(c.posts()[0].status).toBe('simulated');expect(c.posts()[0].processedAt).toBe('2026-11-06T05:00:00.000Z');
  c.reconcile(Date.parse('2026-11-07T00:00:00Z'));expect(c.posts()[1].status).toBe('cancelled');
 });
 it('automatically processes due items while the page is open and keeps modes separate',()=>{
  const c=setup();c.posts.set([{...post(),scheduledAt:'2026-11-06T05:00:10Z'},{...post(),id:'p2',mode:'live'}]);expect(c.rows()).toHaveLength(1);
  vi.advanceTimersByTime(15000);expect(c.posts()[0].status).toBe('simulated');expect(c.posts()[1].status).toBe('scheduled');
 });
 it('cancels an upcoming schedule without deleting it',()=>{const c=setup();c.posts.set([post()]);c.cancel(post());expect(c.posts()[0].status).toBe('cancelled');expect(c.posts()).toHaveLength(1);});
});
