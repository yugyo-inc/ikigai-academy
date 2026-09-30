// Separate from schedule.sessions: these experiences never occupy timeline slots.
// Source: each linked public event page, checked October 1, 2026 (JST).
export const specialEvents = [
  {
    title: 'Japanese Calligraphy',
    subtitle: 'Free Trial & Live Painting',
    when: 'Oct 1 & 2 · JST',
    where: 'Do-Zone / Garden Workshop Area',
    image: '4da538ac1534f08b72d691be61d4da.jpg',
    slug: 'japanese-calligraphy-2026',
    intro: 'Write with Ai Matsuo. Watch live painting by Yuj (Doychang).',
    details: [
      'Oct 1 · Do-Zone: trials at 13:00–13:30, 13:40–14:10 and 14:20–14:50. Live painting starts at 13:30.',
      'Oct 2 · Garden Workshop Area: trials at 12:05–12:30, 12:35–13:00 and 13:05–13:30. Live painting starts at 13:15.',
      'Free hands-on trials are first come, first served; no advance booking. Choose a kanji and take your work home on a wooden keychain or fan. No experience needed.',
      'Reserve a free ticket to watch the live painting. This ticket does not reserve a hands-on trial.'
    ],
    cta: 'Reserve live painting'
  },
  {
    title: 'Seichajo Yamashina',
    subtitle: 'Kyushu Tea & Yame Matcha Lattes',
    when: 'Oct 1 · 12:00–16:00 / Oct 2 · 09:00–16:00 JST',
    where: 'Garden / Chaya',
    image: '76f17e5b6ca8324438ec60b5fdd77d.jpg',
    slug: 'seichajo-yamashina',
    intro: 'Kyushu teas, Yame matcha and hojicha lattes at the garden tea pavilion.',
    details: [
      'Discover selected leaves roasted and blended by a tea master, served hot or iced. Tea-bag packs are also available to take home.',
      'Select your drink or tea-bag product and the day you plan to visit on the booking page.'
    ],
    cta: 'Choose your tea'
  },
  {
    title: 'Matcha & Yukata',
    subtitle: 'The Beauty of Japan',
    when: 'Oct 2 · 12:15–13:30 JST',
    where: 'Do-Zone',
    image: '6c10276b5ec4c6dd51dcbfa3a8b617.jpg',
    slug: 'matcha-tea-yukata-2026',
    intro: 'Whisk your own matcha, enjoy a Japanese sweet and optionally wear a yukata.',
    details: [
      'Sessions: 12:15–12:35, 12:40–13:00 and 13:05–13:30. Up to four guests per session; 12 participants in total.',
      'Your ticket covers one session, not a specific start time. Seats are assigned in arrival order at Do-Zone.',
      'Yukata dressing and a premium matcha souvenir are optional paid add-ons with an experience ticket. Check the booking page for current prices and availability. No previous tea-ceremony experience needed.'
    ],
    cta: 'Book Your Seat'
  },
  {
    title: 'SuzuPay',
    subtitle: 'Pay with Stablecoins, as Easily as Cash',
    when: 'Oct 2 · 10:00–10:45 JST',
    where: 'Luigans Coworking Lounge',
    image: 'be815b94ec3dfb459e66edd0f5a456.jpg',
    slug: 'pay-with-stablecoins-as-easily-as-c',
    intro: 'Kosuke Ai demonstrates QR payments for international visitors in Fukuoka.',
    details: [
      'Explore how SuzuPay converts supported USDT or USDC into spending points at a real-time yen quote for use at participating shops.',
      'Using Fukuoka Builders’ Coliving as an example, the session considers the visitor and merchant experience and plans for wider local adoption.',
      'Kosuke Ai is CEO of GustoDevelopment Inc. and founder of SuzuPay, working on practical applications of AI and blockchain technology.'
    ],
    cta: 'Book Your Seat'
  },
  {
    title: 'Builders’ Coliving',
    subtitle: 'Lunch Meetup & Kickoff',
    when: 'Oct 1 · 12:30–13:45 JST',
    where: 'THE LUIGANS Spa & Resort',
    image: 'e3c50bd7faa63d91aab65b9ed6d949.jpg',
    slug: 'fukuoka-builders-coliving-lunch-mee',
    intro: 'Meet fellow Builders’ Coliving participants and local community leaders.',
    details: [
      'Share your background over lunch and build connections for the upcoming Mastermind, workshop and regional visits.',
      'This is the Builders’ Coliving kickoff meetup, separate from the general Academy lunch buffet. See the event page for participation and booking details.'
    ],
    cta: 'View event & booking'
  }
];

export function renderSpecialEvents() {
  const host = document.querySelector('#special-events-grid');
  if (!host) return;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  host.replaceChildren(...specialEvents.map(event => {
    const card = el('article', 'special-event');
    const image = el('img');
    image.src = `https://cdn.entrytickets.be/images/events/cover/${event.image}`;
    image.alt = `${event.title} — ${event.subtitle}`;
    image.loading = 'lazy';
    image.width = 1200;
    image.height = 675;
    const body = el('div', 'special-event__body');
    const details = el('details', 'special-event__details');
    details.append(el('summary', '', 'Details'));
    event.details.forEach(text => details.append(el('p', '', text)));
    const link = el('a', 'special-event__booking', event.cta);
    link.href = `https://community.colivefukuoka.com/${event.slug}`;
    link.setAttribute('aria-label', `${event.cta}: ${event.title}`);
    body.append(el('p', 'special-event__when', event.when), el('h4', '', event.title), el('p', 'special-event__subtitle', event.subtitle), el('p', 'special-event__where', event.where), el('p', 'special-event__intro', event.intro), details, link);
    card.append(image, body);
    return card;
  }));
}
