import { ScheduledPosts } from './scheduled-posts';
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

// Mẫu bình luận demo: mỗi chủ đề có nhiều cách hỏi khác nhau,
// số lượng khác nhau theo từng kênh để tỷ trọng chủ đề phản ánh thực tế hơn.
const pool: Record<string, string[]> = {
  age: [
    'Bé 3 tuổi chơi bộ này được chưa?',
    'Bé 4 tuổi dùng được không shop?',
    'Con mình 5 tuổi thì chọn bộ nào?',
    'Bé 18 tháng tuổi chơi được không ạ?',
    'Bé 6 tuổi chơi có bị dễ quá không?',
  ],
  safety: [
    'Nhựa này có an toàn không shop?',
    'Có chi tiết nhỏ dễ nuốt không?',
    'Chất liệu có độc hại không ạ?',
    'Cạnh sắc không, bé hay cầm cho vào miệng',
  ],
  play: [
    'Hướng dẫn cách chơi với ạ',
    'Cách lắp ráp có khó không?',
    'Mua về chơi sao vậy shop?',
    'Có video hướng dẫn lắp ráp không?',
    'Luật chơi có dễ hiểu với bé không?',
  ],
  price: [
    'Bao nhiêu tiền, có voucher không?',
    'Có mã ưu đãi livestream không?',
    'Giá bộ này bao nhiêu vậy shop?',
    'Hôm nay có sale không ạ?',
    'Áp voucher thì giảm còn bao nhiêu?',
  ],
  benefit: [
    'Có giúp con phát triển tư duy không?',
    'Chơi cái này có giúp bé tập trung hơn không?',
    'Bộ này rèn kỹ năng gì cho bé ạ?',
  ],
  other: ['Đẹp quá ❤️', 'Chốt đơn một bộ nhé', 'Shop ship Hà Nội mất mấy ngày?', 'Màu xanh còn hàng không?'],
};

// Số bình luận theo chủ đề cho từng kênh: [phiên family, phiên creative]
const mix: Record<string, Record<string, [number, number]>> = {
  facebook: { price: [20, 3], age: [8, 4], safety: [4, 1], play: [2, 3], benefit: [1, 5], other: [3, 2] },
  tiktok: { price: [10, 3], age: [3, 1], safety: [1, 0], play: [14, 16], benefit: [0, 2], other: [4, 4] },
  youtube: { price: [1, 1], age: [2, 1], safety: [4, 1], play: [4, 6], benefit: [5, 6], other: [4, 1] },
};

function buildSamples(session: 0 | 1, offset: number): Comment[] {
  const out: Comment[] = [];
  const names = ['Mẹ Bắp', 'Ba Sóc', 'Mẹ An', 'Ba Minh', 'Mẹ Gấu'];
  for (const [source, topics] of Object.entries(mix))
    for (const [topic, counts] of Object.entries(topics))
      for (let k = 0; k < counts[session]; k++) out.push({ id: '', name: '', text: pool[topic][(k + offset) % pool[topic].length], source, time: '' });
  // Trộn xen kẽ theo thứ tự cố định để danh sách trông tự nhiên
  const mixed = out.map((c, i) => ({ c, k: (i * 37) % out.length })).sort((a, b) => a.k - b.k).map((x) => x.c);
  return mixed.map((c, i) => ({
    ...c,
    id: 'LC' + (offset + i),
    name: names[i % 5] + ' ' + (offset + i + 1),
    time: `20:${String(Math.floor(i / 3)).padStart(2, '0')}`,
  }));
}

const samples: Comment[] = [...buildSamples(0, 0), ...buildSamples(1, 90)];

export function channelLabel(k: string) {
  return ({ facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', zalo: 'Zalo', instagram: 'Instagram', direct: 'Truy cập trực tiếp', manual: 'Nhập tay' } as Record<string, string>)[k] || k;
}

@Component({
  selector: 'app-livestream',
  imports: [FormsModule, CommonModule, ScheduledPosts],
  templateUrl: './livestream.html',
  styleUrl: './livestream.css',
})
export class Livestream {
  readonly mode = input('mock');
  readonly subtab = input<'comments' | 'gallery'>('comments');
  readonly activeSubtab = signal<'comments' | 'gallery' | 'schedule'>('comments');

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
  readonly extra = signal<Record<string, Comment[]>>(this.readComments());
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
    ...(this.extra()['mock:'+this.session()] || []),
    ...(this.extra()['live:'+this.session()] || []),
  ].filter((c) => this.channel() === 'all' || c.source === this.channel()));

  readonly rows = computed(() =>
    this.comments().filter((c) =>
      (c.name + ' ' + c.text).toLowerCase().includes(this.search().toLowerCase())
    )
  );

  // Kênh dùng để xem kết quả sau khi đã phân tích (không cần chạy lại)
  readonly resultChannel = signal('all');
  readonly resultChannels = computed(() =>
    [...new Set((this.result() || []).map((c) => c.source).filter(Boolean) as string[])].sort()
  );
  readonly viewResult = computed(() =>
    (this.result() || []).filter((c) => this.resultChannel() === 'all' || c.source === this.resultChannel())
  );
  channelBreakdown(list: Comment[]) {
    const m = new Map<string, number>();
    for (const c of list) m.set(c.source || 'manual', (m.get(c.source || 'manual') || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, label: channelLabel(k), n }));
  }

  readonly topics = computed(() =>
    groups
      .map((g) => ({
        ...g,
        comments: this.viewResult().filter((c) => classify(c.text).includes(g.id)),
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
      comments: this.viewResult().filter((c) => feedback(c.text) === g.id),
    }))
  );

  readonly classified = computed(
    () => this.viewResult().filter((c) => classify(c.text).length).length
  );

  readonly stale = computed(
    () => this.result() !== null && this.comments().length !== this.result()!.length
  );

  readonly saved = signal<any[]>(this.read());
  readonly savedForMode = computed(() => this.saved());

  // --- Subtab 2: Campaign Gallery Story Insights ---
  insightHeading(i:GalleryStoryInsight){return ({family_play:'Chơi cùng con để gắn kết gia đình',siblings_friends:'Đồ chơi kết nối anh em, bạn bè',creative_craft:'Tự làm đồ chơi, tự do sáng tạo',nostalgia_reconnect:'Tìm lại tuổi thơ để kể cho con',emotional_value:'Kỷ niệm đáng nhớ hơn giá tiền'} as Record<string,string>)[i.id]||i.title;}
  insightMeaning(i:GalleryStoryInsight){return ({family_play:'Những câu chuyện nhắc đến thời gian bên người thân và mong muốn cùng con tạo kỷ niệm mới.',siblings_friends:'Ký ức chơi chung và trao lại đồ chơi làm nổi bật giá trị của sự chia sẻ.',creative_craft:'Tự làm hoặc biến tấu đồ chơi gợi lại niềm vui sáng tạo và trí tưởng tượng.',nostalgia_reconnect:'Món đồ cũ trở thành điểm bắt đầu để kể lại tuổi thơ cho thế hệ sau.',emotional_value:'Điều được nhớ đến là cảm xúc và người cùng chơi, hơn là giá trị món đồ.'} as Record<string,string>)[i.id]||i.summary;}
  readonly galleryView=signal<'insights'|'saved'>('insights');
  readonly rankedInsights=computed(()=>[...(this.galleryResult()?.insights||[])].sort((a,b)=>b.storyCount-a.storyCount));
  readonly selectedGalleryInsight=computed(()=>this.galleryResult()?.insights.find(i=>i.id===this.galleryTopicId()));
  beginGalleryContent(id:string){this.galleryTopicId.set(id);this.galleryFormat.set('post');this.galleryDraft.set(null);this.message.set('');}
  closeGalleryBackdrop(event:MouseEvent,dialog:HTMLDialogElement){if(event.target===dialog)dialog.close();}
  readonly galleryTheme = signal('all');
  readonly galleryChannel = signal('all');
  // Kênh khách đến lần đầu (first-touch UTM) của người gửi câu chuyện
  readonly storySources = computed(() => {
    const m = new Map<string, string>();
    for (const c of this.tracking.customers()) if (c.source) m.set(c.visitor_id, c.source);
    for (const e of this.tracking.events()) if (!m.has(e.visitor_id) && e.utm_source) m.set(e.visitor_id, e.utm_source);
    return m;
  });
  storySource(s: CampaignStory) { return this.storySources().get(s.visitorId) || 'direct'; }
  readonly galleryChannels = computed(() =>
    [...new Set(this.eligibleGalleryStories().map((s) => this.storySource(s)))].sort()
  );
  channelLabel = channelLabel;
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
    visualDirection: string;
    evidence: StoryEvidence[];
  } | null>(null);

  readonly galleryFormat = signal<'video' | 'post'>('video');
  readonly galleryDuration = signal<number>(60);
  readonly galleryTopicId = signal<string>('family_play');

  readonly gallerySelectedStory = signal<CampaignStory | null>(null);
  readonly gallerySaved = signal<any[]>(this.readGalleryDrafts());
  readonly gallerySavedForMode = computed(() =>
    this.gallerySaved()
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
        if (this.galleryChannel() !== 'all' && this.storySource(s) !== this.galleryChannel()) return false;
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

  setSubtab(tab: 'comments' | 'gallery' | 'schedule') {
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
    this.resultChannel.set('all');
    this.draft.set(null);
    this.page.set(0);
    this.message.set('');
    this.search.set('');
  }

  readComments():Record<string,Comment[]>{try{return JSON.parse(localStorage.getItem('ttwr.livestream.comments')||'{}');}catch{return {};}}
  saveComments(next:Record<string,Comment[]>){try{localStorage.setItem('ttwr.livestream.comments',JSON.stringify(next));this.extra.set(next);return true;}catch{this.message.set('Không lưu được bình luận. Vui lòng thử lại.');return false;}}
  add() {
    if (!this.text.trim()) return;
    const c = {
      id: crypto.randomUUID(),
      source: this.inputSource,
      name: this.name.trim() || 'Phụ huynh',
      text: this.text.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    if(!this.saveComments({...this.extra(),[this.key()]:[...(this.extra()[this.key()]||[]),c]}))return;
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
    if(!this.saveComments({...this.extra(),[this.key()]:[...(this.extra()[this.key()]||[]),...imported]}))return;
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
      channel: this.resultChannel() !== 'all' ? this.resultChannel() : this.channel(),
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
      return item;
    } catch {
      this.message.set('Không lưu được: bộ nhớ trình duyệt không khả dụng.');
      return undefined;
    }
  }

  // --- Gallery Insight methods ---
  resetGallery() {
    this.galleryResult.set(null);
    this.galleryDraft.set(null);
    this.galleryPage.set(0);
    this.gallerySearch.set('');
    this.galleryTheme.set('all');
    this.galleryChannel.set('all');
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
    this.message.set('');
    if (res.insights.length) {
      this.galleryTopicId.set(res.insights[0].id);
    }
  }

  galleryVisualDirection(id:string,format:'post'|'video',duration:number){
    const scenes:Record<string,string>={
      family_play:'Cha mẹ và con ngồi trên thảm, cùng lắp một món đồ chơi; cận cảnh bàn tay cùng hoàn thành một chi tiết.',
      siblings_friends:'Hai anh chị em hoặc bạn bè chuyền tay món đồ chơi cũ; chuyển sang cảnh cùng chơi và chia sẻ.',
      creative_craft:'Bàn thủ công với giấy màu, bìa và mảnh ghép; ghi lại từng bước từ vật liệu đến món đồ tự làm.',
      nostalgia_reconnect:'Một người lớn mở hộp đồ chơi cũ, nhìn lại món đồ rồi ngồi kể chuyện cho con.',
      emotional_value:'Món đồ chơi sờn màu đặt cạnh khoảnh khắc gia đình cùng cười và chơi; tập trung vào biểu cảm hơn giá tiền.'
    };
    const scene=scenes[id]||'Một món đồ chơi gắn với ký ức và khoảnh khắc chơi cùng người thân.';
    if(format==='post')return 'Ý tưởng hình ảnh: '+scene+'\nBố cục: ảnh dọc 4:5, một chủ thể chính; chừa khoảng trống phía trên cho câu mở đầu.\nMàu sắc: ánh sáng tự nhiên, tông kem ấm; điểm nhấn vàng đồng bộ campaign.\nChữ trên ảnh: rút câu mở đầu còn 6–10 từ; logo nhỏ ở góc, tránh che khuôn mặt.\nTư liệu: dùng ảnh được cấp quyền hoặc dàn dựng minh họa; không trình bày cảnh dàn dựng như ảnh thật của người kể.';
    const first=Math.round(duration*.2),last=Math.round(duration*.8);
    return 'Định dạng: video dọc 9:16 · '+duration+' giây.\n0–'+first+'s · Mở đầu: cận cảnh món đồ chơi, hiện câu mở đầu ngắn.\n'+first+'–'+last+'s · Câu chuyện: '+scene+' Xen kẽ cảnh toàn và cận, giữ mỗi cảnh 2–4 giây.\n'+last+'–'+duration+'s · Kết: khoảnh khắc cùng chơi, hiện lời kêu gọi hành động.\nÂm thanh: lời kể tự nhiên, nhạc nhẹ có quyền sử dụng; thêm phụ đề dễ đọc.\nTư liệu: dùng cảnh được cấp quyền hoặc quay minh họa; không gán cảnh dàn dựng cho người kể thật.';
  }

  proposeGallery(insightId: string, format?: 'post' | 'video', duration?: number) {
    const res = this.galleryResult();
    if (!res || this.galleryStale()) return;
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
      visualDirection: this.galleryVisualDirection(insight.id,fmt,dur),
      evidence: insight.evidence.slice(0, 3),
    });

  }

  readGalleryDrafts() {
    try {
      return JSON.parse(localStorage.getItem('ttwr.gallery.drafts') || '[]');
    } catch {
      return [];
    }
  }

  scheduleDraft(scheduler:ScheduledPosts,source:'comments'|'gallery',editor?:HTMLDialogElement){
    const saved=source==='gallery'?this.saveGalleryDraft():this.save();
    if(!saved)return;
    editor?.close();
    scheduler.open(saved,source);
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
      return item;
    } catch {
      this.message.set('Không lưu được: bộ nhớ trình duyệt không khả dụng.');
      return undefined;
    }
  }

  async copyGalleryDraft() {
    const d = this.galleryDraft();
    if (!d) return;
    try {
      await navigator.clipboard.writeText([d.title, d.hook, d.outline, d.cta, 'Gợi ý hình ảnh / cách quay video\n'+d.visualDirection].join('\n\n'));
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
