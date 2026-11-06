import { CampaignStory } from '../../../services/campaign-admin-store';
import { MemoryThemeId } from '../../../models/martech-events.model';

export interface StoryEvidence {
  storyId: string;
  cardId: string;
  nickname: string;
  themeId: string;
  year: string;
  excerpt: string;
}

export interface ContentIdea {
  format: 'post' | 'video';
  duration?: number;
  title: string;
  hook: string;
  outline: string;
  cta: string;
  rationale: string;
}

export interface GalleryStoryInsight {
  id: string;
  title: string;
  summary: string;
  category: 'theme' | 'emotion' | 'value' | 'experience';
  storyCount: number;
  sharePercent: number;
  storyIds: string[];
  evidence: StoryEvidence[];
  contentIdeas: ContentIdea[];
}

export interface GalleryAnalysisResult {
  runId: string;
  source: 'mock' | 'live';
  corpusVersion: string;
  generatedAt: string;
  analysisMode: 'rules' | 'ai';
  eligibleStoryCount: number;
  insights: GalleryStoryInsight[];
  themeDistribution: Array<{ themeId: string; name: string; count: number; percent: number }>;
  eraDistribution: Array<{ era: string; count: number; percent: number }>;
}

const THEME_NAMES: Record<string, string> = {
  gach_lego: 'Tháp gạch sắc màu',
  bup_be: 'Búp bê & thú bông',
  board_game: 'Bàn cờ & boardgame',
  canh_dieu: 'Cánh diều & gió lộng',
};

const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

interface ClusterDef {
  id: string;
  title: string;
  summary: string;
  category: 'theme' | 'emotion' | 'value' | 'experience';
  regex: RegExp;
  generateIdeas: (evidence: StoryEvidence[], total: number, themeBreakdown: string) => ContentIdea[];
}

const CLUSTER_DEFS: ClusterDef[] = [
  {
    id: 'family_play',
    title: 'Gắn kết gia đình & Cùng con trải nghiệm',
    summary:
      'Ký ức đậm nét về sự đồng hành của người lớn (bố mẹ, ông bà) trong những buổi chiều bình yên; người kể bày tỏ rõ mong muốn dành thời gian chơi cùng con hôm nay để tạo kỷ niệm gia đình.',
    category: 'emotion',
    regex: /\b(choi cung con|cho con|bo me|ba me|cha me|bo toi|me toi|ba toi|ca nha|gia dinh|ong ba|ong noi|ong ngoai|ba noi|ba ngoai|dong hanh)\b/,
    generateIdeas: (evidence, total, themeBreakdown) => [
      {
        format: 'video',
        duration: 60,
        title: 'Từ chiếc hộp cũ ngày ấy: 15 phút chơi cùng con mỗi tối',
        hook: 'Có bao giờ bạn giật mình nhận ra: điều con cần nhất không phải món đồ chơi đắt tiền, mà là bạn ngồi cạnh?',
        outline:
          '0–5s: Hình ảnh mở chiếc hộp đồ chơi cũ phủ bụi.\n' +
          '5–25s: Trích dẫn câu chuyện của phụ huynh: “' +
          (evidence[0]?.excerpt || 'Điều tôi nhớ nhất là cảm giác có người ngồi bên cạnh, lắng nghe và cùng chia sẻ') +
          '”. Giải thích: ' +
          evidence.length +
          '/' +
          total +
          ' câu chuyện nhấn mạnh sự gắn kết gia đình.\n' +
          '25–50s: Làm mẫu tình huống 15 phút chơi cùng con: tháo gỡ quy tắc, cùng con sáng tạo câu chuyện riêng.\n' +
          '50–60s: Mời phụ huynh ghé góc quà tặng để tìm gợi ý đồ chơi tương tác cùng con.',
        cta: 'Chia sẻ câu chuyện chơi cùng con của bạn hoặc khám phá đồ chơi kết nối tại MyKingdom!',
        rationale:
          'Đánh trúng nhu cầu của phụ huynh hiện đại: mong muốn bù đắp thời gian chất lượng cho con qua đồ chơi gắn kết.',
      },
      {
        format: 'post',
        title: 'Nước cờ đầu tiên bố nhường quân và bài học lớn lên của chúng ta',
        hook: 'Hồi bé, bạn có từng thắc mắc vì sao bố luôn nhường bạn chọn quân đầu tiên?',
        outline:
          'Những câu chuyện trong Gallery chiến dịch nhắc chúng ta nhớ rằng: niềm vui tuổi thơ thường bắt đầu từ một người lớn kiên nhẫn ngồi xuống sàn nhà cùng ta.\n\n' +
          'Một phụ huynh chia sẻ: “' +
          (evidence[0]?.excerpt || 'Bố thường nhường tôi chọn quân đầu tiên, nhưng vẫn giải thích thật kỹ vì sao một nước đi lại hay') +
          '”\n\n' +
          'Hôm nay, khi trở thành phụ huynh, bạn đã sẵn sàng nhường con một nước đi và cùng con cười thật to chưa? Dành cho con một buổi tối trọn vẹn không điện thoại, chỉ có tiếng cười gia đình.\n\n' +
          '#TheToysWeRemember #MyKingdom #ChoiCungCon #KyUcTuoiTho',
        cta: 'Bình luận trò chơi gia đình bạn thích nhất hoặc ghé MyKingdom để chọn bộ trò chơi cùng con cuối tuần này!',
        rationale: 'Khai thác cảm xúc hoài niệm cha mẹ - con cái, tỷ lệ tương tác và bình luận cao.',
      },
    ],
  },
  {
    id: 'siblings_friends',
    title: 'Tình thân anh em, bạn bè & Đồ chơi trao lại',
    summary:
      'Đồ chơi là sợi dây kết nối bạn bè cùng xóm và anh chị em trong nhà; những món đồ chơi sờn màu được trao lại hoặc chuyền tay mang giá trị cảm xúc đặc biệt sâu đậm.',
    category: 'experience',
    regex: /\b(anh trai|chi gai|em trai|em gai|anh em|chi em|trao lai|ban be|ban than|ban trong xom|hang xom|nhom ban|cac ban|chuyen tay)\b/,
    generateIdeas: (evidence, total) => [
      {
        format: 'video',
        duration: 45,
        title: 'Chú gấu bông sờn màu của chị và bài học chia sẻ đầu đời',
        hook: 'Món đồ chơi đầu tiên của bạn là đồ mới tinh trong hộp, hay là món được anh chị trao lại?',
        outline:
          '0–5s: Cận cảnh món đồ chơi hơi sờn màu nhưng được giữ gìn cẩn thận.\n' +
          '5–20s: Trích câu chuyện khách hàng: “' +
          (evidence[0]?.excerpt || 'Món đồ chơi được chị trao lại hơi sờn màu, nhưng tôi luôn giữ trong một chiếc túi sạch') +
          '”.\n' +
          '20–35s: Thông điệp: đồ chơi có thể cũ theo năm tháng, nhưng tình cảm và bài học sẻ chia thì luôn mới.\n' +
          '35–45s: Gợi ý những món đồ chơi bền bỉ để anh chị em trong gia đình có thể cùng chơi và truyền lại cho nhau.',
        cta: 'Bạn từng được trao lại món đồ chơi nào? Kể cho MyKingdom nghe nhé!',
        rationale: 'Tạo cảm xúc đồng điệu về tình anh em, tính bền bỉ và giá trị tiếp nối của đồ chơi.',
      },
      {
        format: 'post',
        title: 'Tiếng bạn gọi nhau trước cổng nhà — Bạn còn nhớ buổi chiều hè năm ấy?',
        hook: '“Ê, ra chơi đồ chơi đi!” — Đã bao lâu rồi bạn không nghe thấy câu nói ấy?',
        outline:
          'Trong ký ức của ' + evidence.length + '/' + total + ' người kể tham gia “The Toys We Remember”, những ngày vui nhất luôn bắt đầu bằng tiếng bạn gọi nhau trước cổng.\n\n' +
          'Không có màn hình điện thoại, chỉ có vài viên gạch xếp, bộ cờ cá ngựa hay chiếc diều giấy tự dán mà cả xóm cười vang từ trưa tới tối mịt.\n\n' +
          'Hãy để con bạn hôm nay cũng có những người bạn tuổi thơ và những trò chơi kết nối như thế.\n\n' +
          '#TheToysWeRemember #BanBeTuoiTho #MyKingdom',
        cta: 'Tag người bạn thuở nhỏ của bạn vào đây để cùng ôn lại ký ức nhé!',
        rationale: 'Tạo cơ hội viral tự nhiên khi người đọc tag bạn bè thời thơ ấu.',
      },
    ],
  },
  {
    id: 'creative_craft',
    title: 'Sáng tạo, cải biến & Trí tưởng tượng tự do',
    summary:
      'Trẻ em ngày ấy tự lắp ráp, tháo ra làm lại, dán diều bằng giấy báo hay dùng hộp giấy làm nhà cho búp bê; tự hào khi tạo ra thứ gì đó của riêng mình mà không cần theo khuôn mẫu.',
    category: 'theme',
    regex: /\b(lap|thao ra|tuong tuong|vot|lam dieu|hop giay|mo hinh|thiet ke|ghep|dieu giay|ve o|sang tao)\b/i,
    generateIdeas: (evidence, total) => [
      {
        format: 'video',
        duration: 60,
        title: 'Khi thiếu một mảnh ghép, trí tưởng tượng của con bắt đầu',
        hook: 'Bạn có khó chịu khi con lắp đồ chơi chẳng giống hình mẫu trên vỏ hộp?',
        outline:
          '0–10s: Bé lắp chiếc xe không đều cánh nhưng cười toe toét khoe bố mẹ.\n' +
          '10–30s: Trích dẫn ký ức: “' +
          (evidence[0]?.excerpt || 'Một vài mảnh bị thiếu khiến tôi phải nghĩ cách thay đổi thiết kế của căn nhà trong tưởng tượng') +
          '”.\n' +
          '30–50s: Lời khuyên giáo dục: Đồ chơi tốt là đồ chơi mở ra khả năng sáng tạo không giới hạn, khuyến khích con thử sai và giải quyết vấn đề.\n' +
          '50–60s: Giới thiệu dòng đồ chơi xếp hình, sáng tạo tại MyKingdom.',
        cta: 'Khám phá các bộ lắp ghép sáng tạo không giới hạn tại MyKingdom ngay hôm nay!',
        rationale: 'Định vị đồ chơi như công cụ nuôi dưỡng tư duy sáng tạo và khả năng thích ứng của trẻ.',
      },
      {
        format: 'post',
        title: 'Chiếc máy bay có đôi cánh không đều và sự tự hào của đứa trẻ ngày ấy',
        hook: 'Không cần đúng mẫu, chỉ cần là tác phẩm của chính mình.',
        outline:
          'Một câu chuyện xúc động trong Gallery chiến dịch: “' +
          (evidence[0]?.excerpt || 'Tôi mang mô hình vừa lắp khoe cả nhà, dù nó chỉ là một chiếc máy bay có đôi cánh không đều') +
          '”\n\n' +
          'Đôi khi người lớn chúng ta quá bận tâm đến sự hoàn hảo mà quên mất rằng: niềm vui sáng tạo nằm ở quá trình con tự tay biến ý tưởng thành hiện thực.\n\n' +
          'Cùng MyKingdom tôn vinh mọi ý tưởng khác biệt của con bạn hôm nay!\n\n' +
          '#TheToysWeRemember #SangTaoCungCon #MyKingdom',
        cta: 'Khoe tác phẩm lắp ghép gần nhất của bé nhà bạn ở phần bình luận nhé!',
        rationale: 'Khuyến khích UGC ảnh/bình luận về sản phẩm sáng tạo của các bé.',
      },
    ],
  },
  {
    id: 'nostalgia_reconnect',
    title: 'Tìm lại món đồ cũ & Kể cho thế hệ sau',
    summary:
      'Người tham gia tìm thấy chiếc hộp cũ khi dọn nhà hoặc nhìn thấy đồ chơi gợi nhớ tuổi thơ; họ bày tỏ mong muốn tìm lại phiên bản tương tự để cùng gia đình trải nghiệm và kể câu chuyện xưa.',
    category: 'value',
    regex: /\b(tim lai|hop cu|gan giong|ke cho|ke lai|don nha|mon qua nho|phien ban|nho ra|nam ay|ngay ay)\b/i,
    generateIdeas: (evidence, total) => [
      {
        format: 'video',
        duration: 30,
        title: 'Tìm lại món đồ chơi năm ấy: Tấm vé một chiều về tuổi thơ',
        hook: 'Nếu được tìm lại một món đồ chơi thời thơ ấu, bạn sẽ chọn món nào?',
        outline:
          '0–5s: Bàn tay mở chiếc hộp ký ức cũ.\n' +
          '5–20s: Trích dẫn: “' +
          (evidence[0]?.excerpt || 'Nếu tìm lại được một phiên bản gần giống, tôi sẽ rủ cả nhà cùng thử và kể lại câu chuyện ngày ấy') +
          '”.\n' +
          '20–30s: Giới thiệu bộ sưu tập The Toys We Remember — những biểu tượng tuổi thơ được làm mới cho cả gia đình.',
        cta: 'Tìm lại món đồ chơi gắn liền với tuổi thơ của bạn tại MyKingdom!',
        rationale: 'Kích hoạt mong muốn tìm lại ký ức, thúc đẩy chuyển đổi sang cửa hàng gợi ý quà.',
      },
      {
        format: 'post',
        title: 'Chiếc hộp cũ phủ bụi và câu chuyện chưa từng kể với con',
        hook: 'Có những món đồ chơi ta giữ suốt 20 năm, chỉ để chờ một ngày kể cho con nghe.',
        outline:
          'Dọn nhà cuối năm, tình cờ bắt gặp chiếc hộp nhỏ dưới gầm tủ: bộ cờ sứt góc, chú gấu bông mòn lông hay vài mảnh ghép nhiều màu.\n\n' +
          'Đó không chỉ là đồ vật, mà là bằng chứng sống động cho tuổi thơ đầy ắp tiếng cười của bố mẹ.\n\n' +
          'Hãy cùng con mở chiếc hộp ấy, kể cho con nghe bạn đã từng lớn lên hạnh phúc như thế nào.\n\n' +
          '#TheToysWeRemember #HopKyUc #MyKingdom',
        cta: 'Món đồ chơi nào bạn vẫn còn giữ đến tận hôm nay? Chia sẻ cùng MyKingdom nhé!',
        rationale: 'Đánh trúng thời điểm chuyển giao/dọn nhà, tạo sự gắn kết liên thế hệ.',
      },
    ],
  },
  {
    id: 'emotional_value',
    title: 'Kỷ niệm giản đơn & Giá trị tinh thần vượt trên giá tiền',
    summary:
      'Cảm xúc cốt lõi: người kể nhớ tiếng cười, sự hiện diện và cảm giác được lắng nghe hơn là giá trị vật chất của món quà; những khoảnh khắc giản dị nhất lại là ký ức bền bỉ nhất.',
    category: 'emotion',
    regex: /\b(tieng cuoi|gia tien|gia tri|don gian|lang nghe|chia se|dang nho|khong can moi thu|nguyen ven)\b/i,
    generateIdeas: (evidence, total) => [
      {
        format: 'video',
        duration: 60,
        title: 'Món quà giá trị nhất không nằm ở tem giá',
        hook: 'Món quà đắt nhất bạn từng nhận có phải là món bạn nhớ nhất?',
        outline:
          '0–10s: So sánh hai hình ảnh: hộp quà đắt tiền và chiếc diều giấy tự làm.\n' +
          '10–30s: Dẫn chứng từ câu chuyện: “' +
          (evidence[0]?.excerpt || 'Mỗi lần nghĩ lại, tôi nhớ tiếng cười nhiều hơn giá tiền của món quà') +
          '”.\n' +
          '30–50s: Thông điệp MyKingdom: Giá trị thực sự của đồ chơi nằm ở nụ cười và kỷ niệm mà nó tạo ra cho tuổi thơ của con.\n' +
          '50–60s: Đồng hành cùng phụ huynh mang đến niềm vui trọn vẹn cho con mỗi ngày.',
        cta: 'Cùng MyKingdom trao cho con những kỷ niệm tuổi thơ vô giá!',
        rationale: 'Xây dựng thiện cảm thương hiệu (brand love) sâu sắc, vượt lên cạnh tranh về giá.',
      },
      {
        format: 'post',
        title: 'Nhớ tiếng cười nhiều hơn giá tiền của món quà',
        hook: 'Điều gì còn lại sau khi một món đồ chơi đã cũ?',
        outline:
          '“Tôi không cần mọi thứ giống hệt tuổi thơ; chỉ mong niềm vui được chia sẻ vẫn còn nguyên vẹn.”\n\n' +
          'Trong ' + total + ' ký ức đã duyệt của chiến dịch, ' + evidence.length + ' câu chuyện nhắc đến tiếng cười, sự lắng nghe hoặc người ngồi cạnh…\n\n' +
          'Món quà tuyệt vời nhất cha mẹ có thể tặng con chính là sự hiện diện trọn vẹn trong tuổi thơ của con.\n\n' +
          '#TheToysWeRemember #GiaTriKyUc #MyKingdom',
        cta: 'Bạn đồng ý không? Thả tim nếu bạn cũng tin rằng tiếng cười của con là vô giá!',
        rationale: 'Thông điệp nhân văn, dễ tạo tương tác cảm xúc và chia sẻ trên mạng xã hội.',
      },
    ],
  },
];

function extractExcerpt(text: string, regex: RegExp): string {
  const sentences = text.split(/(?<=[.?!])\s+/);
  for (const s of sentences) {
    if (regex.test(norm(s))) {
      return s.trim().slice(0, 160);
    }
  }
  return (sentences[0] || text).trim().slice(0, 160);
}

export function analyzeGalleryStories(
  stories: CampaignStory[],
  filters: { themeId?: string; eraCategory?: string; from?: string; to?: string } = {},
  source: 'mock' | 'live' = 'live'
): GalleryAnalysisResult {
  // 1. Filter stories by Gallery eligibility and user criteria
  const day = (timestamp: string) => (timestamp || '').slice(0, 10);
  const eligible = stories.filter(s => {
    if (!s.ugcConsent || !s.submitted || s.status !== 'approved') return false;
    if (filters.themeId && filters.themeId !== 'all' && s.theme_id !== filters.themeId) return false;
    if (filters.eraCategory && filters.eraCategory !== 'all' && s.eraCategory !== filters.eraCategory) return false;
    if (filters.from && day(s.createdAt) < filters.from) return false;
    if (filters.to && day(s.createdAt) > filters.to) return false;
    return true;
  });

  const total = eligible.length;

  // 2. Distributions
  const themesMap = new Map<string, number>();
  const erasMap = new Map<string, number>();
  for (const s of eligible) {
    themesMap.set(s.theme_id, (themesMap.get(s.theme_id) || 0) + 1);
    erasMap.set(s.eraCategory, (erasMap.get(s.eraCategory) || 0) + 1);
  }

  const themeDistribution = Object.entries(THEME_NAMES).map(([id, name]) => {
    const count = themesMap.get(id) || 0;
    return {
      themeId: id,
      name,
      count,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });

  const eraDistribution = ['80s', '90s', '00s', '10s'].map(era => {
    const count = erasMap.get(era) || 0;
    return {
      era,
      count,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });

  // 3. Cluster into insights
  const insights: GalleryStoryInsight[] = CLUSTER_DEFS.map(cluster => {
    const matchedStories = eligible.filter(s => cluster.regex.test(norm(s.storyText)));
    const storyIds = matchedStories.map(s => s.id);
    const storyCount = matchedStories.length;
    const sharePercent = total ? Math.round((storyCount / total) * 1000) / 10 : 0;

    const evidence: StoryEvidence[] = matchedStories.map(s => ({
      storyId: s.id,
      cardId: s.cardId,
      nickname: s.nickname,
      themeId: s.theme_id,
      year: s.periodYear,
      excerpt: extractExcerpt(s.storyText, cluster.regex),
    }));

    const themeBreakdown = themeDistribution
      .filter(t => t.count > 0)
      .map(t => `${t.name} (${t.count})`)
      .join(', ');

    const contentIdeas = cluster.generateIdeas(evidence, total, themeBreakdown);

    return {
      id: cluster.id,
      title: cluster.title,
      summary: cluster.summary,
      category: cluster.category,
      storyCount,
      sharePercent,
      storyIds,
      evidence,
      contentIdeas,
    };
  }).filter(insight => insight.storyCount > 0);

  return {
    runId: 'RUN_' + crypto.randomUUID().slice(0, 8),
    source: source,
    corpusVersion: '1.0',
    generatedAt: new Date().toISOString(),
    analysisMode: 'rules',
    eligibleStoryCount: total,
    insights,
    themeDistribution,
    eraDistribution,
  };
}

