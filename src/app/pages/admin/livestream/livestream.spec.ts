import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { classify, Livestream } from './livestream';
import { analyzeGalleryStories } from './gallery-insights';
import { CampaignAdminStore, CampaignStory } from '../../../services/campaign-admin-store';
import { MemoryThemeId } from '../../../models/martech-events.model';

describe('Livestream comment classification', () => {
  it('supports accented text and multiple needs', () =>
    expect(classify('Bé 3 tuổi chơi được không, nhựa có an toàn không?')).toEqual(['age', 'safety']));
  it('does not manufacture needs for reactions or order-only comments', () => {
    expect(classify('Đẹp quá ❤️')).toEqual([]);
    expect(classify('Chốt đơn một bộ')).toEqual([]);
  });
  it('does not treat family mentions as price questions', () =>
    expect(classify('Cả gia đình cùng chơi')).not.toContain('price'));
  it('recognizes instructions and offers', () =>
    expect(classify('Hướng dẫn cách chơi và voucher')).toEqual(['play', 'price']));
});

describe('Gallery story insight engine', () => {
  const sampleStories: CampaignStory[] = [
    {
      id: 'S01',
      cardId: 'C01',
      visitorId: 'V01',
      sessionId: 'S01',
      nickname: 'Mẹ Bắp',
      periodYear: '1998',
      eraCategory: '90s',
      theme_id: MemoryThemeId.GACH_LEGO,
      storyText: 'Bố ngồi trên sàn nhà kiên nhẫn hướng dẫn tôi lắp từng mảnh gạch. Bây giờ tôi muốn dành thêm thời gian chơi cùng con.',
      photoUrl: null,
      ugcConsent: true,
      submitted: true,
      status: 'approved',
      featured: true,
      createdAt: '2026-11-10T10:00:00+07:00',
    },
    {
      id: 'S02',
      cardId: 'C02',
      visitorId: 'V02',
      sessionId: 'S02',
      nickname: 'Ba Sóc',
      periodYear: '2001',
      eraCategory: '00s',
      theme_id: MemoryThemeId.CANH_DIEU,
      storyText: 'Tôi và bạn cùng vót thanh tre làm diều, dán bằng giấy báo cũ. Chiếc diều bay lên cao làm cả đám reo hò.',
      photoUrl: null,
      ugcConsent: true,
      submitted: true,
      status: 'approved',
      featured: false,
      createdAt: '2026-11-15T15:00:00+07:00',
    },
    {
      id: 'S03',
      cardId: 'C03',
      visitorId: 'V03',
      sessionId: 'S03',
      nickname: 'Chị Na',
      periodYear: '1995',
      eraCategory: '90s',
      theme_id: MemoryThemeId.BUP_BE,
      storyText: 'Món đồ chơi được chị trao lại hơi sờn màu nhưng tôi luôn giữ gìn. Giá trị kỷ niệm nhiều hơn giá tiền.',
      photoUrl: null,
      ugcConsent: true,
      submitted: true,
      status: 'approved',
      featured: false,
      createdAt: '2026-11-20T12:00:00+07:00',
    },
    {
      id: 'S04_pending',
      cardId: 'C04',
      visitorId: 'V04',
      sessionId: 'S04',
      nickname: 'Chưa duyệt',
      periodYear: '2005',
      eraCategory: '00s',
      theme_id: MemoryThemeId.BOARD_GAME,
      storyText: 'Chơi cờ cùng gia đình.',
      photoUrl: null,
      ugcConsent: true,
      submitted: true,
      status: 'pending',
      featured: false,
      createdAt: '2026-11-25T12:00:00+07:00',
    },
    {
      id: 'S05_no_consent',
      cardId: 'C05',
      visitorId: 'V05',
      sessionId: 'S05',
      nickname: 'Không consent',
      periodYear: '1999',
      eraCategory: '90s',
      theme_id: MemoryThemeId.GACH_LEGO,
      storyText: 'Lắp ráp sáng tạo.',
      photoUrl: null,
      ugcConsent: false,
      submitted: true,
      status: 'approved',
      featured: false,
      createdAt: '2026-11-22T12:00:00+07:00',
    },
  ];

  it('filters strictly to approved UGC stories and computes theme/era distribution', () => {
    const res = analyzeGalleryStories(sampleStories);
    expect(res.eligibleStoryCount).toBe(3);
    expect(res.themeDistribution.find((t) => t.themeId === 'gach_lego')?.count).toBe(1);
    expect(res.eraDistribution.find((e) => e.era === '90s')?.count).toBe(2);
  });

  it('clusters stories into insights with genuine evidence from real story IDs', () => {
    const res = analyzeGalleryStories(sampleStories);
    expect(res.insights.length).toBeGreaterThan(0);
    const familyInsight = res.insights.find((i) => i.id === 'family_play');
    expect(familyInsight).toBeDefined();
    expect(familyInsight?.storyIds).toContain('S01');
    expect(familyInsight?.evidence[0].nickname).toBe('Mẹ Bắp');
    expect(familyInsight?.contentIdeas.length).toBeGreaterThan(0);
  });

  it('filters by theme, era, and date range without fabricating results', () => {
    const res = analyzeGalleryStories(sampleStories, { themeId: 'canh_dieu' });
    expect(res.eligibleStoryCount).toBe(1);
    expect(res.insights.some((i) => i.storyIds.includes('S02'))).toBe(true);
    expect(res.insights.some((i) => i.storyIds.includes('S01'))).toBe(false);

    const empty = analyzeGalleryStories(sampleStories, { themeId: 'board_game' });
    expect(empty.eligibleStoryCount).toBe(0);
    expect(empty.insights).toHaveLength(0);
  });
});

describe('Livestream & Gallery subtabs integration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [Livestream] });
  });

  it('generates source-backed post and video drafts and isolates real-input mode from sample comments', () => {
    const fixture = TestBed.createComponent(Livestream);
    fixture.componentRef.setInput('mode', 'mock');
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.analyze();
    page.format = 'post';
    page.propose('safety');
    expect(page.draft()?.format).toBe('post');
    expect(page.draft()?.evidence.length).toBeGreaterThan(0);
    expect(page.draft()?.outline).toContain('bình luận');
    page.save();
    expect(page.saved()).toHaveLength(1);
    page.format = 'video';
    page.duration = 30;
    page.propose('age');
    expect(page.draft()?.outline).toContain('22–30');
    fixture.componentRef.setInput('mode', 'live');
    fixture.detectChanges();
    expect(page.comments()).toHaveLength(0);
    expect(page.result()).toBeNull();
    page.inputSource = 'tiktok';
    page.bulk = 'Bé 4 tuổi chơi được không?\nCó hướng dẫn cách chơi không?';
    page.importComments();
    expect(page.comments()).toHaveLength(2);
    page.analyze();
    expect(page.topics().find((g) => g.id === 'age')?.comments).toHaveLength(1);
    page.text = 'Món này giá bao nhiêu?';
    page.add();
    expect(page.stale()).toBe(true);
    page.draft.set(null);
    page.propose('price');
    expect(page.draft()).toBeNull();
  });

  it('supports Gallery insight subtab, performs analysis on eligible stories, and generates drafts', () => {
    const fixture = TestBed.createComponent(Livestream);
    fixture.componentRef.setInput('mode', 'live');
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const store = TestBed.inject(CampaignAdminStore);

    // Switch to gallery subtab
    page.setSubtab('gallery');
    expect(page.activeSubtab()).toBe('gallery');
    expect(page.eligibleGalleryStories()).toHaveLength(0);

    // Add a story and approve UGC
    const story = store.captureStory(
      {
        nickname: 'Mẹ Bắp',
        periodYear: '1998',
        eraCategory: '90s',
        storyText: 'Bố thường kiên nhẫn ngồi chơi cùng tôi. Giờ đây tôi muốn dành thời gian chơi cùng con.',
        photoUrl: null,
        theme_id: MemoryThemeId.GACH_LEGO,
      },
      true
    )!;
    store.moderate(story.id, 'approved');
    fixture.detectChanges();

    expect(page.eligibleGalleryStories()).toHaveLength(1);
    expect(page.galleryResult()).toBeNull();

    // Analyze gallery stories
    page.analyzeGallery();
    expect(page.galleryResult()).not.toBeNull();
    expect(page.galleryResult()?.eligibleStoryCount).toBe(1);
    expect(page.galleryResult()?.insights.length).toBeGreaterThan(0);

    // Create a post draft from the insight
    const insightId = page.galleryResult()!.insights[0].id;
    page.proposeGallery(insightId, 'post');
    expect(page.galleryDraft()).not.toBeNull();
    expect(page.galleryDraft()?.format).toBe('post');
    expect(page.galleryDraft()?.evidence[0].storyId).toBe(story.id);

    expect(page.galleryDraft()?.visualDirection).toContain('4:5');
    page.galleryDraft()!.visualDirection='Hướng dẫn hình ảnh đã chỉnh';
    // Save draft
    page.saveGalleryDraft();
    expect(page.gallerySavedForMode()).toHaveLength(1);
    expect(page.gallerySavedForMode()[0].visualDirection).toBe('Hướng dẫn hình ảnh đã chỉnh');
    page.proposeGallery(insightId,'video',30);
    expect(page.galleryDraft()?.visualDirection).toContain('9:16 · 30 giây');
    expect(page.galleryDraft()?.visualDirection).toContain('24–30s');

    // Story dialog preview
    page.openStoryDialog(story);
    expect(page.gallerySelectedStory()?.id).toBe(story.id);
    page.closeStoryDialog();
    expect(page.gallerySelectedStory()).toBeNull();
  });
});
