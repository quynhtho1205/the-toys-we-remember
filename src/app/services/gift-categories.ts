export type GiftCollection = 'racing'|'building'|'plush'|'family';
export const GIFT_CATEGORIES:{id:GiftCollection;name:string;emoji:string;interest:string}[]=[
  {id:'racing',name:'Xe đua',emoji:'🏎️',interest:'xe đua'},
  {id:'building',name:'Lắp ghép',emoji:'🧱',interest:'lắp ghép'},
  {id:'plush',name:'Búp bê & thú bông',emoji:'🧸',interest:'búp bê, thú bông'},
  {id:'family',name:'Trò chơi gia đình',emoji:'🎲',interest:'trò chơi gia đình'},
];

// Match whole phrases to avoid unrelated words being classified as a preference.
export function findGiftCollection(normalized:string):GiftCollection|undefined {
  if(/\b(xe dua|dua xe|racing|race car|f1|formula|drift|xe hoi|o to)\b/.test(normalized))return 'racing';
  if(/\b(lap ghep|lap rap|lego|xep hinh|ghep hinh|xay nha|sang tao)\b/.test(normalized))return 'building';
  if(/\b(bup be|thu bong|gau bong|tho bong|gau|ke chuyen|nhap vai)\b/.test(normalized))return 'plush';
  if(/\b(tro choi gia dinh|board game|boardgame|ban co|co vua|co ca ngua|co|tri nho|tu duy|rut go|xep thap)\b/.test(normalized))return 'family';
  return undefined;
}
