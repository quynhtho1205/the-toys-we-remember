import { Component, computed, input, signal, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CampaignAdminStore, CampaignStory } from '../../../services/campaign-admin-store';
import { AdminDataSource } from '../../../services/admin-data-source';
import {
  analyzeGalleryStories,
  GalleryAnalysisResult,
  GalleryStoryInsight,
  ContentIdea,
  StoryEvidence,
} from './gallery-insights';

export interface Comment {
  id: string;
  name: string;
  text: string;
  time: string;
  source?: string;
}

const groups = [
  {
    id: 'age',
    name: 'Độ tuổi phù hợp',
    keys: ['tuoi', 'may thang', 'be 3', 'be 4', 'be 5'],
    title: 'Chọn đồ chơi phù hợp độ tuổi của con',
    hook: 'Bé mấy tuổi thì chơi được món này?',
    outline:
      'Giới thiệu độ tuổi khuyến nghị trên nhãn sản phẩm. Minh họa mức độ khó và cách phụ huynh đồng hành.',
  },
  {
    id: 'safety',
    name: 'An toàn & chất liệu',
    keys: ['an toan', 'nhua', 'chat lieu', 'doc hai', 'nuot', 'canh sac'],
    title: 'Cận cảnh chất liệu và thông tin an toàn của đồ chơi',
    hook: 'Trước khi chọn đồ chơi, phụ huynh cần kiểm tra những gì?',
    outline:
      'Quay cận cảnh nhãn, chất liệu và cảnh báo chi tiết nhỏ. Xác minh thông tin bằng tài liệu sản phẩm trước khi viết lời khẳng định.',
  },
  {
    id: 'play',
    name: 'Cách chơi & hướng dẫn',
    keys: ['cach choi', 'choi sao', 'huong dan', 'lap rap', 'choi nhu', 'luat choi'],
    title: 'Hướng dẫn cùng con chơi trong 60 giây',
    hook: 'Mở hộp xong thì bắt đầu chơi thế nào?',
    outline:
      'Giới thiệu các bộ phận. Làm mẫu từng bước và một tình huống chơi cùng con. Kết thúc bằng mẹo cất giữ.',
  },
  {
    id: 'price',
    name: 'Giá & ưu đãi',
    keys: ['gia', 'bao nhieu', 'giam', 'ma uu dai', 'voucher', 'sale'],
    title: 'Giải thích giá và cách dùng ưu đãi livestream',
    hook: 'Làm sao nhận và sử dụng mã ưu đãi?',
    outline:
      'Dùng mức giá và điều kiện ưu đãi đã được xác nhận. Làm mẫu cách nhận mã qua liên kết và cách áp dụng khi mua.',
  },
  {
    id: 'benefit',
    name: 'Giá trị phát triển',
    keys: ['phat trien', 'tu duy', 'sang tao', 'ky nang', 'tap trung'],
    title: 'Một buổi chơi cùng con có thể học được gì?',
    hook: 'Ngoài niềm vui, con có thể luyện kỹ năng nào khi chơi?',
    outline:
      'Minh họa hoạt động quan sát, phối hợp và giải quyết vấn đề. Tránh cam kết kết quả phát triển chưa có bằng chứng.',
  },
];

export function classify(text: string) {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
  return groups
    .filter((g) =>
      g.keys.some((k) => (k === 'gia' ? /\bgia\b(?!\s+dinh)/.test(t) : t.includes(k)))
    )
    .map((g) => g.id);
}

export function feedback(text: string) {
  const t = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
  return /lo ngai|lo lang|so |khong an toan|khong thich|khong tot|khong ben|doc hai|de nuot|canh sac|chat luong kem/.test(
    t
  )
    ? 'concern'
    : /dep|thich|hay qua|tot|ben|ung y/.test(t)
    ? 'praise'
    : 'other';
}

const examples = [
  'Bé 3 tuổi chơi bộ này được chưa?',
  'Nhựa này có an toàn không shop?',
  'Hướng dẫn cách chơi với ạ',
  'Bao nhiêu tiền, có voucher không?',
  'Có giúp con phát triển tư duy không?',
  'Bé 4 tuổi dùng được không, có chi tiết nhỏ dễ nuốt không?',
  'Đẹp quá ❤️',
  'Chốt đơn một bộ nhé',
  'Cách lắp ráp có khó không?',
  'Có mã ưu đãi livestream không?',
];

const samples: Comment[] = Array.from({ length: 150 }, (_, i) => ({
  id: 'LC' + i,
  name: ['Mẹ Bắp', 'Ba Sóc', 'Mẹ An', 'Ba Minh', 'Mẹ Gấu'][i % 5] + ' ' + (i + 1),
  text: examples[i % examples.length],
  source: ['facebook', 'tiktok', 'youtube'][i % 3],
  time: `20:${String(Math.floor(i/3)).padStart(2, '0')}`,
}));

@Component({
  selector: 'app-livestream',
  imports: [FormsModule, CommonModule],
  templateUrl: './livestream.html',
  styleUrl: './livestream.css',
})
export class Livestream {
  readonly mode = input('mock');
  readonly subtab = input<'comments' | 'gallery'>('comments');
  readonly activeSubtab = signal<'comments' | 'gallery'>('comments');

  readonly store = inject(CampaignAdminStore);
  readonly tracking = inject(AdminDataSource);

  // --- Subtab 1: Livestream / Comments ---
  readonly channel = signal('all');
  format: 'video' | 'post' = 'video';
  duration = 60;
  topicId = 'age';
  bulk = '';
  inputSource = 'tiktok';
  readonly session = signal('family');
  readonly extra = signal<Record<string, Comment[]>>({});
  readonly result = signal<Comment[] | null>(null);
  readonly draft = signal<{
    group: string;
    title: string;
    hook: string;
    outline: string;
    cta: string;
    evidence: string[];
    format: string;
    channel: string;
  } | null>(null);
  readonly message = signal('');
  readonly page = signal(0);
  readonly search = signal('');
  name = '';
  text = '';

  readonly comments = computed(() => [
    ...(this.mode() === 'mock'
      ? samples.slice(this.session() === 'family' ? 0 : 90, this.session() === 'family' ? 90 : 150)
      : []),
    ...(this.extra()[this.key()] || []),
  ].filter((c) => this.channel() === 'all' || c.source === this.channel()));

  readonly rows = computed(() =>
    this.comments().filter((c) =>
      (c.name + ' ' + c.text).toLowerCase().includes(this.search().toLowerCase())
    )
  );

  readonly topics = computed(() =>
    groups
      .map((g) => ({
        ...g,
        comments: (this.result() || []).filter((c) => classify(c.text).includes(g.id)),
      }))
      .sort((a, b) => b.comments.length - a.comments.length)
  );

  readonly feedbackRows = computed(() =>
    [
      { id: 'praise', name: 'Khen / yêu thích' },
      { id: 'concern', name: 'Lo ngại / cần làm rõ' },
      { id: 'other', name: 'Trung tính / chưa phân loại' },
    ].map((g) => ({
      ...g,
      comments: (this.result() || []).filter((c) => feedback(c.text) === g.id),
    }))
  );

  readonly classified = computed(
    () => (this.result() || []).filter((c) => classify(c.text).length).length
  );

  readonly stale = computed(
    () => this.result() !== null && this.comments().length !== this.result()!.length
  );

  readonly saved = signal<any[]>(this.read());
  readonly savedForMode = computed(() => this.saved().filter((d) => d.mode === this.mode()));

  // --- Subtab 2: Campaign Gallery Story Insights ---
  readonly galleryTheme = signal('all');
  readonly galleryEra = signal('all');
  readonly galleryFrom = signal('');
  readonly galleryTo = signal('');
  readonly gallerySearch = signal('');
  readonly galleryPage = signal(0);

  readonly galleryResult = signal<GalleryAnalysisResult | null>(null);
  readonly galleryLastAnalyzedCount = signal(0);
  readonly galleryLastAnalyzedIds = signal<string>('');
  readonly galleryDraft = signal<{
    insightId: string;
    insightTitle: string;
    format: 'post' | 'video';
    duration?: number;
    title: string;
    hook: string;
    outline: string;
    cta: string;
    evidence: StoryEvidence[];
  } | null>(null);

  readonly galleryFormat = signal<'video' | 'post'>('video');
  readonly galleryDuration = signal<number>(60);
  readonly galleryTopicId = signal<string>('family_play');

  readonly gallerySelectedStory = signal<CampaignStory | null>(null);
  readonly gallerySaved = signal<any[]>(this.readGalleryDrafts());
  readonly gallerySavedForMode = computed(() =>
    this.gallerySaved().filter((d) => d.mode === this.mode())
  );

  // Eligible stories: approved + submitted + ugcConsent
  readonly eligibleGalleryStories = computed(() =>
    this.store
      .stories()
      .filter((s) => s.ugcConsent && s.submitted && s.status === 'approved')
  );

  readonly filteredGalleryStories = computed(() => {
    const q = this.gallerySearch().trim().toLowerCase();
    const day = (ts: string) => (ts || '').slice(0, 10);
    return this.eligibleGalleryStories()
      .filter((s) => {
        if (this.galleryTheme() !== 'all' && s.theme_id !== this.galleryTheme()) return false;
        if (this.galleryEra() !== 'all' && s.eraCategory !== this.galleryEra()) return false;
        if (this.galleryFrom() && day(s.createdAt) < this.galleryFrom()) return false;
        if (this.galleryTo() && day(s.createdAt) > this.galleryTo()) return false;
        if (q && !`${s.nickname} ${s.storyText} ${s.periodYear} ${s.theme_id}`.toLowerCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt));
  });

  readonly galleryStale = computed(() => {
    if (!this.galleryResult()) return false;
    const ids = this.filteredGalleryStories().map((s) => s.id).sort().join('|');
    return ids !== this.galleryLastAnalyzedIds();
  });

  constructor() {
    effect(() => {
      this.mode();
      this.reset();
      this.resetGallery();
    });
    effect(() => {
      if (this.subtab()) this.activeSubtab.set(this.subtab());
    });
  }

  setSubtab(tab: 'comments' | 'gallery') {
    this.activeSubtab.set(tab);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  themeName(id: string): string {
    return (
      ({
        gach_lego: 'Tháp gạch sắc màu',
        bup_be: 'Búp bê & thú bông',
        board_game: 'Bàn cờ & boardgame',
        canh_dieu: 'Cánh diều & gió lộng',
      } as Record<string, string>)[id] || id
    );
  }

  themeEmoji(id: string): string {
    return (
      ({
        gach_lego: '🧱',
        bup_be: '🧸',
        board_game: '🎲',
        canh_dieu: '🪁',
      } as Record<string, string>)[id] || '✦'
    );
  }

  // --- Comment methods ---
  async copyDraft() {
    const d = this.draft();
    if (!d) return;
    try {
      await navigator.clipboard.writeText([d.title, d.hook, d.outline, d.cta].join('\n\n'));
      this.message.set('Đã sao chép bản nháp.');
    } catch {
      this.message.set('Không sao chép được. Bạn có thể chọn và sao chép nội dung trong các ô.');
    }
  }

  key() {
    return this.mode() + ':' + this.session();
  }

  read() {
    try {
      return JSON.parse(localStorage.getItem('ttwr.livestream.drafts') || '[]');
    } catch {
      return [];
    }
  }

  reset() {
    this.result.set(null);
    this.draft.set(null);
    this.page.set(0);
    this.message.set('');
    this.search.set('');
  }

  add() {
    if (!this.text.trim()) return;
    const c = {
      id: crypto.randomUUID(),
      source: this.inputSource,
      name: this.name.trim() || 'Phụ huynh',
      text: this.text.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    this.extra.update((v) => ({ ...v, [this.key()]: [...(v[this.key()] || []), c] }));
    this.text = '';
    this.page.set(Math.floor((this.comments().length - 1) / 10));
    this.message.set('Đã thêm bình luận. Bấm phân tích để cập nhật kết quả.');
  }

  analyze() {
    this.result.set([...this.comments()]);
    this.draft.set(null);
    this.message.set('Đã phân tích toàn bộ bình luận của phiên đang chọn.');
  }

  importComments() {
    const lines = this.bulk
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 500);
    if (!lines.length) return;
    const imported = lines.map((text, i) => ({
      id: crypto.randomUUID(),
      name: 'Người xem ' + (i + 1),
      text: text.slice(0, 2000),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      source: this.inputSource,
    }));
    this.extra.update((v) => ({ ...v, [this.key()]: [...(v[this.key()] || []), ...imported] }));
    this.bulk = '';
    this.message.set('Đã nhập ' + imported.length + ' bình luận. Hãy chạy phân tích để cập nhật.');
  }

  propose(id: string) {
    const g = this.topics().find((g) => g.id === id);
    if (!g || !g.comments.length || this.stale()) return;
    this.topicId = id;
    const total = this.result()?.length || 0;
    const outline =
      this.format === 'video'
        ? `0–5 giây · MỞ ĐẦU\n${g.hook}\n\n5–${Math.round(
            this.duration * 0.35
          )} giây · NHU CẦU THỰC TẾ\nTrích câu hỏi: “${g.comments[0].text}” (${
            g.comments.length
          }/${total} bình luận đề cập ${g.name.toLowerCase()}).\n\n${Math.round(
            this.duration * 0.35
          )}–${this.duration - 8} giây · MINH HỌA\n${
            g.outline
          }\nQuay cận cảnh đồ chơi và một tình huống phụ huynh chơi cùng con.\n\n${
            this.duration - 8
          }–${
            this.duration
          } giây · KẾT\nMời phụ huynh chia sẻ độ tuổi và sở thích để được gợi ý phù hợp.`
        : `${g.hook}\n\nTừ ${total} bình luận đang phân tích, ${
            g.comments.length
          } bình luận nhắc đến ${g.name.toLowerCase()}. Một câu hỏi tiêu biểu: “${
            g.comments[0].text
          }”\n\n${
            g.outline
          }\n\nGia đình mình đang cần giải đáp điều gì? Chia sẻ trong bình luận hoặc ghé góc quà tặng để xem gợi ý theo người nhận.\n\n#TheToysWeRemember #ChoiCungCon`;
    if (typeof requestAnimationFrame === 'function')
      requestAnimationFrame(() => {
        const el = document.getElementById('content-studio');
        if (typeof el?.scrollIntoView === 'function')
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    this.draft.set({
      group: g.name,
      title: g.title,
      hook: g.hook,
      outline,
      format: this.format,
      channel: this.channel(),
      cta: 'Bình luận câu hỏi hoặc ghé góc quà tặng để chọn món phù hợp với gia đình.',
      evidence: g.comments.slice(0, 3).map((c) => (c.source || 'Nhập tay') + ' · ' + c.name + ': ' + c.text),
    });
  }

  save() {
    if (!this.draft()) return;
    const item = {
      ...structuredClone(this.draft()),
      mode: this.mode(),
      session: this.session(),
      id: crypto.randomUUID(),
    };
    try {
      const next = [item, ...this.read()];
      localStorage.setItem('ttwr.livestream.drafts', JSON.stringify(next));
      this.saved.set(next);
      this.message.set('Đã lưu ý tưởng tại trình duyệt.');
      this.draft.set(null);
    } catch {
      this.message.set('Không lưu được: bộ nhớ trình duyệt không khả dụng.');
    }
  }

  // --- Gallery Insight methods ---
  resetGallery() {
    this.galleryResult.set(null);
    this.galleryDraft.set(null);
    this.galleryPage.set(0);
    this.gallerySearch.set('');
    this.galleryTheme.set('all');
    this.galleryEra.set('all');
    this.galleryFrom.set('');
    this.galleryTo.set('');
  }

  analyzeGallery() {
    const stories = this.filteredGalleryStories();
    if (!stories.length) {
      this.message.set('Không có câu chuyện nào đủ điều kiện trong phạm vi lọc.');
      return;
    }
    const res = analyzeGalleryStories(
      stories,
      {
        themeId: this.galleryTheme(),
        eraCategory: this.galleryEra(),
        from: this.galleryFrom(),
        to: this.galleryTo(),
      },
      this.mode() as 'mock' | 'live'
    );
    this.galleryResult.set(res);
    this.galleryLastAnalyzedCount.set(stories.length);
    this.galleryLastAnalyzedIds.set(stories.map((s) => s.id).sort().join('|'));
    this.galleryDraft.set(null);
    this.message.set(`Đã phân tích ${res.eligibleStoryCount} câu chuyện Gallery đã được duyệt.`);
    if (res.insights.length) {
      this.galleryTopicId.set(res.insights[0].id);
    }
  }

  proposeGallery(insightId: string, format?: 'post' | 'video', duration?: number) {
    const res = this.galleryResult();
    if (!res) return;
    const insight = res.insights.find((i) => i.id === insightId);
    if (!insight) return;

    const fmt = format || this.galleryFormat();
    const dur = duration || this.galleryDuration();
    this.galleryTopicId.set(insightId);
    this.galleryFormat.set(fmt);
    this.galleryDuration.set(dur);

    const idea =
      insight.contentIdeas.find((i) => i.format === fmt && (!i.duration || i.duration === dur)) ||
      insight.contentIdeas.find((i) => i.format === fmt) ||
      insight.contentIdeas[0];

    this.galleryDraft.set({
      insightId: insight.id,
      insightTitle: insight.title,
      format: fmt,
      duration: dur,
      title: idea?.title || insight.title,
      hook: idea?.hook || insight.summary,
      outline: idea?.outline || insight.summary,
      cta: idea?.cta || 'Khám phá ký ức tuổi thơ tại MyKingdom!',
      evidence: insight.evidence.slice(0, 3),
    });

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const el = document.getElementById('gallery-content-studio');
        if (typeof el?.scrollIntoView === 'function')
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  readGalleryDrafts() {
    try {
      return JSON.parse(localStorage.getItem('ttwr.gallery.drafts') || '[]');
    } catch {
      return [];
    }
  }

  saveGalleryDraft() {
    const d = this.galleryDraft();
    if (!d) return;
    const item = {
      ...structuredClone(d),
      mode: this.mode(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    try {
      const next = [item, ...this.readGalleryDrafts()];
      localStorage.setItem('ttwr.gallery.drafts', JSON.stringify(next));
      this.gallerySaved.set(next);
      this.message.set('Đã lưu bản nháp ký ức tại trình duyệt.');
      this.galleryDraft.set(null);
    } catch {
      this.message.set('Không lưu được: bộ nhớ trình duyệt không khả dụng.');
    }
  }

  async copyGalleryDraft() {
    const d = this.galleryDraft();
    if (!d) return;
    try {
      await navigator.clipboard.writeText([d.title, d.hook, d.outline, d.cta].join('\n\n'));
      this.message.set('Đã sao chép bản nháp nội dung.');
    } catch {
      this.message.set('Không sao chép được. Bạn có thể chọn và sao chép nội dung trong các ô.');
    }
  }

  openStoryDialog(s: CampaignStory) {
    this.gallerySelectedStory.set(s);
  }

  openStoryById(storyId: string) {
    const story = this.store.stories().find((s) => s.id === storyId);
    if (story) {
      this.gallerySelectedStory.set(story);
    }
  }

  closeStoryDialog() {
    this.gallerySelectedStory.set(null);
  }
}
