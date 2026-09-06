/** 婚礼请柬的文字与已确认信息。 */

export const couple = {
  a: { first: '汪家喆', last: '', voice: '汪家喆' },
  b: { first: '朱敏', last: '', voice: '朱敏' },
} as const

export const occasion = {
  weekday: '星期六',
  day: '3日',
  month: '10月',
  year: '2026年',
  dateLong: '2026 年 10 月 3 日',
  dateShort: '10月3日',
  lunar: '农历八月廿三',
  city: '黄山 · 歙县',
  venue: '黄山市歙县徽苑一楼',
  room: '2号厅',
  address: '黄山市歙县徽苑一楼2号厅',
  iso: '2026-10-03',
}

export const photos = {
  pull: {
    src: './img/pull-faces-wide.webp',
    alt: '朱敏与汪家喆相拥微笑，两人的面容清晰可见',
    mobileSrc: './img/pull-faces.webp',
    mobileAlt: '朱敏与汪家喆相拥微笑，两人的面容清晰可见',
  },
  day: {
    src: './img/our-day.webp',
    alt: '朱敏与汪家喆在草坪上牵手转身，朱敏手持白色花束',
  },
} as const

export const storyPhotos = [
  { src: './img/thread-01.webp', alt: '汪家喆与朱敏并肩站在草坪上，身旁是白色花束与木桌椅' },
  { src: './img/thread-02.webp', alt: '朱敏与汪家喆在花园木椅上并肩而坐，一起微笑看向镜头' },
  { src: './img/thread-03.webp', alt: '朱敏身着粉色礼服举起花束，汪家喆在花墙前与她相依而立' },
  { src: './img/thread-04.webp', alt: '汪家喆与身穿红色礼服的朱敏在中式庭院里牵手相伴' },
  { src: './img/thread-05.webp', alt: '朱敏轻提白色婚纱，与汪家喆牵手倾身，一同微笑' },
] as const

export const overture = {
  kicker: '诚邀你，共赴我们的婚礼',
  findPointer: '轻移指尖，寻见红线',
  findTouch: '轻触此页，寻见红线',
  found: '原来，缘分在这里',
  scrollHint: '循着红线，往下读',
  jump: '直接查看婚礼安排',
}

/** 第一章：一根红线，两端心意。 */
export const thread = {
  index: '一 · 牵线',
  title: '牵线',
  lead: '关于相逢，人们说起一根红线。',
  body:
    '在月老牵红线的传说里，缘分有了细细的形状。它穿过人海，连起两端，' +
    '也让“你”和“我”，有了写成“我们”的可能。借这根红线，' +
    '我们把对往后日子的期许，轻轻系进这封请柬。',
  aside: '红线的两端，\n是汪家喆，也是朱敏。',
  pairs: [
    {
      a: '愿往后的清晨，有一句早安。',
      b: '愿每一个夜晚，都有人说晚安。',
    },
    {
      a: '愿平常的一餐一饭，也值得期待。',
      b: '愿细小的欢喜，都能与你分享。',
    },
    {
      a: '愿一起走过的路，慢一点也无妨。',
      b: '愿沿途的风景，总有你在身旁。',
    },
    {
      a: '把往后的日子，交给我们。',
      b: '把这一刻的喜悦，分享给你。',
    },
  ],
}

/** 第二章：随滚动展露相片，心意自然抵达。 */
export const pull = {
  index: '二 · 相引',
  title: '相引',
  lead: '心意相牵，终有回响。',
  body:
    '把欢喜写进今天，把相伴留给往后。\n愿有岁月可回首，愿有日常可相守。',
  photoCaption: '汪家喆与朱敏 · 把往后的日子，写成我们。',
  notes: [
    { u: 0.16, strand: 0, text: '愿有岁月可回首' },
    { u: 0.4, strand: 1, text: '愿有日常可相守' },
    { u: 0.63, strand: 0, text: '把欢喜写进今天' },
    { u: 0.86, strand: 1, text: '把相伴留给往后' },
  ],
}

/** 第三章：红线相系，发出婚礼邀请。 */
export const tie = {
  index: '三 · 相系',
  title: '相系',
  before: '当红线的两端，走向同一个明天，',
  headline: '我们，结婚了。',
  merged: '2026 年 10 月 3 日\n我们结婚，诚邀你见证。',
  after: '这一刻的圆满，\n盼有你在场。',
}

/** 第四章：红线化作赴约的指引。 */
export const day = {
  index: '四 · 赴约',
  title: '赴约',
  lead: '把这一天，留给相聚。',
  schedule: [
    {
      time: '17:28',
      name: '到场相聚',
      where: '徽苑一楼2号厅',
      note: '带着喜悦而来，与我们相聚。',
    },
    {
      time: '17:58',
      name: '婚礼仪式',
      where: '徽苑一楼2号厅',
      note: '请你见证，我们人生的新一页。',
    },
  ],
  venue: {
    name: '黄山市歙县徽苑一楼',
    address: ['2号厅'],
  },
  labels: { where: '婚礼地点', wear: '诚挚邀约' },
  dress: '汪家喆与朱敏，盼与你共赴这场欢喜。',
  photoCaption: '汪家喆与朱敏 · 愿往后的每一页，都有彼此。',
}

/** 第五章：红线围住邀请，随这一页一起收束。 */
export const ring = {
  index: '五 · 圆满',
  title: '圆满',
  lead: '红线成环，\n也想把你写进\n这份圆满。',
  closing: '有你在，才是圆满。',
}

export const colophon = {
  signature: '汪家喆 · 朱敏 敬邀',
}
