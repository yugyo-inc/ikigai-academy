import {
  formatDateRange,
  formatDayTab,
  formatLongDay,
  formatTimeLabel,
  parseTimeRange,
} from "./tokyo-time.js";

const ROOM_ORDER = ["MAIN", "A", "B", "G", "LOUNGE", "BEACH", "OUT"];
const DEFAULT_CATEGORY_COLOR = "#0069A0";
const FACE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";
const faceObserver =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const image = entry.target;
            image.src = image.dataset.src;
            image.removeAttribute("data-src");
            observer.unobserve(image);
          });
        },
        { rootMargin: "1200px 0px" },
      )
    : null;

export function renderHeader(schedule) {
  setText("event-name", schedule.event.name);
  setText("event-dates", formatDateRange(schedule.event.dates));
  setText("event-venue", schedule.event.venue);

  const mapLink = document.querySelector("#map-open-link");
  const bookingLink = document.querySelector("#all-booking-link");
  const vipLink = document.querySelector("#vip-dinner-link");

  mapLink.href = schedule.event.venue_map;
  document.querySelector("#venue-address").textContent = schedule.event.venue_address || schedule.event.venue;
  document.querySelector("#google-map-link").href = schedule.event.google_maps;
  bookingLink.href = schedule.event.booking_base;
  vipLink.href = schedule.event.vip_dinner;

  const stickyVenueMapLink = document.querySelector("#sticky-venue-map-link");
  const stickyGoogleMapLink = document.querySelector("#sticky-google-map-link");
  if (stickyVenueMapLink) stickyVenueMapLink.href = schedule.event.venue_map;
  if (stickyGoogleMapLink) stickyGoogleMapLink.href = schedule.event.google_maps;
}

export function renderDayTabs(schedule, selectedDay, onSelect) {
  const container = document.querySelector("#day-tabs");
  container.replaceChildren();

  schedule.event.dates.forEach((date, index) => {
    const copy = formatDayTab(date, index);
    const button = element("button", "day-tab");
    button.type = "button";
    button.id = `day-tab-${index + 1}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(date === selectedDay));
    button.setAttribute("aria-controls", "timeline");
    button.dataset.day = date;
    button.append(document.createTextNode(copy.label));
    button.append(element("span", "", copy.detail));
    button.addEventListener("click", () => onSelect(date));
    container.append(button);
  });
}

export function renderFilters(categories, selectedCategories, onToggle, onClear) {
  const container = document.querySelector("#filter-chips");
  const clearButton = document.querySelector("#clear-filters");
  container.replaceChildren();

  Object.entries(categories).forEach(([key, category]) => {
    const button = element("button", "filter-chip", category.en);
    button.type = "button";
    button.dataset.category = key;
    button.style.setProperty("--category", category.color);
    button.setAttribute("aria-pressed", String(selectedCategories.has(key)));
    button.addEventListener("click", () => onToggle(key));
    container.append(button);
  });

  clearButton.hidden = selectedCategories.size === 0;
  clearButton.onclick = onClear;
}

export function renderSchedule(schedule, selectedDay, selectedCategories, query = "", view = "list") {
  const timeline = document.querySelector("#timeline");
  const dateLabel = document.querySelector("#schedule-date");
  const status = document.querySelector("#filter-status");
  const sessions = schedule.sessions.filter((session) => session.day === selectedDay);
  const allDisplaySessions = mergeContinuationSlots(sessions);
  const filtered = selectedCategories.size > 0 || query.trim().length > 0;
  const displaySessions = allDisplaySessions.filter(session => matchesSession(schedule, session, selectedCategories, query));
  renderLounge(schedule, selectedDay);
  document.querySelector("#lounge-info").hidden = filtered;
  document.querySelector("#clear-search").hidden = !filtered;
  document.querySelector("#view-list").setAttribute("aria-pressed", String(filtered || view === "list"));
  document.querySelector("#view-timeline").setAttribute("aria-pressed", String(!filtered && view === "timeline"));

  dateLabel.textContent = formatLongDay(selectedDay);
  timeline.setAttribute(
    "aria-labelledby",
    schedule.event.dates.indexOf(selectedDay) === 0 ? "day-tab-1" : "day-tab-2",
  );
  timeline.replaceChildren();

  // Search results are compact lists across both days, never faded timeline slots.
  if (filtered) {
    const days = query.trim() ? schedule.event.dates : [selectedDay];
    let total = 0;
    dateLabel.textContent = query.trim() ? "Search results · Both days" : formatLongDay(selectedDay);
    timeline.setAttribute("aria-labelledby", "filter-title");
    for (const day of days) {
      const matches = mergeContinuationSlots(schedule.sessions.filter(s => s.day === day))
        .filter(s => matchesSession(schedule, s, selectedCategories, query));
      total += matches.length;
      if (!matches.length) continue;
      const section = element("section", "search-results-day");
      section.append(element("h3", "search-day-heading", `Day ${schedule.event.dates.indexOf(day) + 1} · ${formatLongDay(day)}`));
      const list = element("div", "search-results-list");
      matches.forEach(s => {
        const card = s.presentation === "invitation" ? renderInvitationNotice(schedule, s, new Set(), "") : createSessionCard(schedule, s, new Set(), "");
        card.prepend(element("p", "result-time", `${formatTimeLabel(s._displayTime || s.time)} · JST`));
        list.append(card);
      });
      section.append(list);
      timeline.append(section);
    }
    status.textContent = `${total} matching ${total === 1 ? "session" : "sessions"}${query.trim() ? " across both days" : " on this day"}.`;
    if (!total) timeline.append(element("p", "search-empty", "No sessions found. Try another name or clear your search and filters."));
    return;
  }

  if (view === "timeline") {
    const dinners = element("section", "program-dinners");
    dinners.setAttribute("aria-label", "Evening events");
    timeline.append(renderHorizontalTimeline(schedule, selectedDay, displaySessions.filter(s => s.room !== "OUT")));
    displaySessions.filter(s => s.room === "OUT" && s.title !== "Bus Transportation").sort((a, b) => Number(a.presentation === "invitation") - Number(b.presentation === "invitation")).forEach(s => {
      if (s.banner) {
        dinners.append(renderDinnerBanner(schedule, s));
        return;
      }
      const card = s.presentation === "invitation" ? renderInvitationNotice(schedule, s, new Set(), "") : createSessionCard(schedule, s, new Set(), "");
      if (s.presentation !== "invitation") {
        const time = element("p", "result-time", `${formatTimeLabel(s.time)} · JST`);
        const banner = card.querySelector(".event-banner");
        if (banner) banner.after(time); else card.prepend(time);
      }
      dinners.append(card);
    });
    timeline.append(dinners);
    status.textContent = "";
    return;
  }

  const groups = groupSessionsByTime(displaySessions.filter((session) => session.presentation !== "invitation" && session.title !== "Bus Transportation"));
  for (let index = 0; index < groups.length; ) {
    if (!isWorkshopGroup(groups[index])) {
      timeline.append(renderTimeGroup(schedule, groups[index], selectedCategories, query));
      index += 1;
      continue;
    }

    const workshopGroups = [];
    while (index < groups.length && isWorkshopGroup(groups[index])) {
      workshopGroups.push(groups[index]);
      index += 1;
    }
    timeline.append(renderWorkshopBlock(schedule, workshopGroups, selectedCategories, query));
  }

  displaySessions.filter((session) => session.presentation === "invitation").forEach((session) => {
    timeline.append(renderInvitationNotice(schedule, session, selectedCategories, query));
  });

  if (!displaySessions.length) {
    timeline.append(element("p", "now-empty", "No sessions are listed for this day."));
  }

  status.textContent = `${displaySessions.length} sessions on this day. Search to find sessions across both days.`;
}

export function renderSpeakers(schedule, onOpenProfile) {
  const grid = document.querySelector("#speaker-grid");
  grid.replaceChildren();

  schedule.speakers.forEach((speaker) => {
    const category = schedule.categories[speaker.category];
    const card = element("button", "speaker-card");
    card.type = "button";
    card.style.setProperty("--category", category?.color || "#9EDCFF");

    const portrait = element(
      "span",
      `speaker-portrait${speaker.photos.length > 1 ? " speaker-portrait--multi" : ""}`,
    );
    if (speaker.group_image) {
      portrait.className = "speaker-portrait speaker-portrait--group";
      portrait.append(createGroupImage(speaker));
    } else {
      speaker.photos.slice(0, 2).forEach((photo) => portrait.append(createFaceImage(photo)));
    }

    card.append(portrait);
    card.append(element("span", "speaker-name", speaker.name));
    if (speaker.members) card.append(element("span", "speaker-members", speaker.members));
    card.append(element("span", "speaker-session", speaker.session || speaker.role));
    card.setAttribute("aria-label", `View profile for ${speaker.name}`);
    card.addEventListener("click", () => onOpenProfile(speaker));
    grid.append(card);
  });
}

export function renderSpeakerProfile(schedule, speaker, selectedDay, onFindSession) {
  const dialog = document.querySelector("#speaker-dialog");
  const content = document.querySelector("#speaker-dialog-content");
  content.replaceChildren();
  const portrait = element("div", "speaker-dialog__portrait");
  if (speaker.group_image) {
    portrait.classList.add("speaker-dialog__portrait--group");
    portrait.append(createGroupImage(speaker));
    content.classList.add("has-group-portrait");
  } else {
    content.classList.remove("has-group-portrait");
    speaker.photos.slice(0, 2).forEach((photo) => portrait.append(createFaceImage(photo)));
  }
  const copy = element("div", "speaker-dialog__copy");
  copy.append(element("p", "speaker-dialog__eyebrow", speaker.role || "Ikigai Academy Co-Creator"));
  const heading = element("h2", "", speaker.name);
  heading.id = "speaker-dialog-title";
  copy.append(heading);
  if (speaker.members) copy.append(element("p", "speaker-members", speaker.members));
  if (speaker.bio) copy.append(element("p", "speaker-dialog__bio", speaker.bio));
  if (speaker.profile_url) {
    const source = element("a", "", "Read the event introduction");
    source.href = speaker.profile_url;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    copy.append(source);
  }
  const sessions = findSpeakerSessions(schedule, speaker);
  if (sessions.length) {
    copy.append(element("h3", "speaker-dialog__sessions-heading", "Sessions on October 1–2"));
    const list = element("ul", "speaker-dialog__sessions");
    sessions.forEach((session) => {
      const item = element("li", "speaker-dialog__session-item");
      item.append(element("p", "speaker-dialog__session", session.title));
      const day = schedule.event.dates.indexOf(session.day) + 1;
      item.append(element("p", "speaker-dialog__when", `Day ${day} · ${formatTimeLabel(session._displayTime || session.time)} · ${schedule.rooms[session.room] || session.room}`));
      const button = element("button", "primary-button", "View session in program");
      button.type = "button";
      button.setAttribute("aria-label", `View ${session.title}, Day ${day}, in program`);
      button.addEventListener("click", () => {
        dialog.close();
        onFindSession(speaker, session);
      });
      item.append(button);
      list.append(item);
    });
    copy.append(list);
  } else {
    copy.append(element("p", "speaker-dialog__unlisted", "No session is listed for this person on October 1–2."));
  }
  content.append(portrait, copy);
  dialog.showModal();
  dialog.scrollTop = 0;
}

export function findSpeakerSession(schedule, speaker, selectedDay) {
  const candidates = findSpeakerSessions(schedule, speaker);
  return candidates.find((session) => session.day === selectedDay) || candidates[0] || null;
}

export function findSpeakerSessions(schedule, speaker) {
  const photoKeys = new Set(speaker.photos || []);
  const speakerSession = normalize(speaker.session);
  const sessions = mergeContinuationSlots(schedule.sessions);
  // Photos identify people across multiple sessions; titles are a fallback only.
  const photoMatches = sessions.filter((session) =>
    (session.photos || []).some((photo) => photoKeys.has(photo)),
  );
  const candidates = photoMatches.length ? photoMatches : sessions.filter((session) =>
    speakerSession.length > 3 && normalize(session.title) === speakerSession,
  );
  return candidates.filter((session) => session.note !== "cont").sort((a, b) =>
    a.day.localeCompare(b.day) || (parseTimeRange(a.time)?.start ?? 9999) - (parseTimeRange(b.time)?.start ?? 9999),
  );
}

function renderTimeGroup(schedule, group, selectedCategories, query) {
  const wrapper = element("section", "time-group");
  const time = element("p", "time-label", formatTimeLabel(group.time));
  const range = parseTimeRange(group.time);
  time.append(element("span", "", range?.openEnded ? "Start time · JST" : "Venue time · JST"));

  const grid = element(
    "div",
    `session-grid${isWorkshopGrid(group.sessions) ? " session-grid--workshops" : ""}`,
  );
  group.sessions.sort(compareRooms).forEach((session) => {
    grid.append(createSessionCard(schedule, session, selectedCategories, query));
  });

  wrapper.append(time, grid);
  return wrapper;
}

function renderWorkshopBlock(schedule, groups, selectedCategories, query) {
  const block = element("div", "workshop-block");
  block.setAttribute("role", "group");
  block.setAttribute("aria-label", "Concurrent workshops by room");

  groups.forEach((group, index) => {
    const row = renderTimeGroup(schedule, group, selectedCategories, query);
    row.classList.add("time-group--workshop");
    row.style.setProperty("--slot-row", String(index + 1));
    block.append(row);
  });

  return block;
}

function createSessionCard(schedule, session, selectedCategories, query) {
  const category = schedule.categories[session.category];
  const categoryColor = category?.color || DEFAULT_CATEGORY_COLOR;
  const classes = [
    "session-card",
    `session-card--${session.kind}`,
    `session-card--room-${session.room}`,
  ];
  if (session.note === "soon") classes.push("session-card--soon");
  if (session._spanSlots) classes.push("session-card--spanning");

  if (selectedCategories.size || query.trim()) {
    classes.push(matchesSession(schedule, session, selectedCategories, query) ? "is-filter-match" : "is-muted");
  }

  const card = element("article", classes.join(" "));
  card.id = sessionId(session);
  card.dataset.category = session.category || "none";
  card.dataset.sessionTitle = session.title || "";
  card.style.setProperty("--category", categoryColor);
  if (session.banner) card.append(createSessionBanner(schedule, session));
  const cardTop = element("div", "session-card__top");
  cardTop.append(element("p", "room-label", schedule.rooms[session.room] || session.room_label || session.room));
  if (category) {
    const chip = element("span", "category-chip", category.en);
    chip.style.setProperty("--category", category.color);
    cardTop.append(chip);
  }
  card.append(cardTop);

  if (session.note === "soon") {
    card.append(element("span", "soon-badge", "Coming soon"));
  }

  if (session._displayTime) {
    const duration = element("span", "session-duration", formatTimeLabel(session._displayTime));
    duration.setAttribute("aria-label", "Runs across two program slots");
    card.append(duration);
  }

  if (session.photos?.length) {
    const avatars = element("div", "session-avatars");
    session.photos.forEach((photo) => avatars.append(createProfileFace(schedule, photo)));
    card.append(avatars);
  }

  if (session.partner_logo) {
    const logo = document.createElement("img");
    logo.className = "partner-logo";
    logo.src = session.partner_logo;
    logo.alt = "Fukuoka Now";
    logo.loading = "lazy";
    card.append(logo);
  }

  card.append(element("h3", "session-title", session.title));
  if (session.who) card.append(element("p", "session-who", session.who));

  const footer = element("div", "session-footer");

  const bus = session.title === "Bus Transportation" && schedule.event.bus_reservations?.[session.day];
  if (bus?.return_slug) {
    footer.append(createBusLink(schedule, bus.return_slug, session.day, "return"));
    footer.append(element("p", "bus-login-note", "Log in on the booking page to choose your bus and reserve a seat."));
  } else if (session.community_slug) {
    const link = element("a", "book-link", "Book Your Seat");
    link.href = bookingUrl(schedule.event.booking_base, session.community_slug);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Book your seat for ${session.title}`);
    footer.append(link);
  }

  if (footer.childNodes.length) card.append(footer);
  return card;
}

function renderInvitationNotice(schedule, session, selectedCategories, query) {
  const notice = element("aside", "session-card invitation-notice");
  notice.id = sessionId(session);
  notice.dataset.sessionTitle = session.title;
  notice.dataset.category = session.category || "none";
  if (selectedCategories.size || query.trim()) {
    notice.classList.add(matchesSession(schedule, session, selectedCategories, query) ? "is-filter-match" : "is-muted");
  }
  if (session.banner) notice.append(createSessionBanner(schedule, session));
  notice.append(element("p", "invitation-notice__label", "A note for invited guests"));
  const title = element("h3", "", session.title);
  title.id = `${notice.id}-title`;
  notice.setAttribute("aria-labelledby", title.id);
  notice.append(title);
  notice.append(element("p", "invitation-notice__time", `${formatTimeLabel(session.time)} · JST`));
  notice.append(element("p", "", session.who));
  if (session.community_slug) {
    const link = element("a", "invitation-notice__link", "View invitation details");
    link.href = bookingUrl(schedule.event.booking_base, session.community_slug);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    notice.append(link);
  }
  return notice;
}

function renderDinnerBanner(schedule, session) {
  const card = element("article", "session-card dinner-banner-card");
  card.id = sessionId(session);
  card.setAttribute("aria-label", session.title);
  card.append(createSessionBanner(schedule, session));
  const invited = session.presentation === "invitation";
  const button = element("a", "dinner-book-button", invited ? "View Invitation" : "Book Your Seat");
  button.href = bookingUrl(schedule.event.booking_base, session.community_slug);
  button.target = "_blank"; button.rel = "noopener noreferrer";
  button.setAttribute("aria-label", `${invited ? "View invitation" : "Book your seat"} for ${session.title}`);
  card.append(button);
  return card;
}

function createSessionBanner(schedule, session) {
  const link = element("a", "event-banner");
  link.href = bookingUrl(schedule.event.booking_base, session.community_slug);
  link.target = "_blank"; link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `View event details: ${session.title}`);
  const image = document.createElement("img");
  image.src = session.banner;
  image.alt = session.title;
  image.width = 1200; image.height = 675;
  image.loading = "lazy"; image.decoding = "async";
  link.append(image);
  return link;
}

function createBusLink(schedule, slug, day, direction) {
  const link = element("a", "book-link", "Reserve a Bus Seat");
  link.href = bookingUrl(schedule.event.booking_base, slug);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `Reserve a bus seat: Day ${schedule.event.dates.indexOf(day) + 1} ${direction}`);
  return link;
}

function createGroupImage(speaker) {
  const image = document.createElement("img");
  image.src = speaker.group_image;
  image.alt = speaker.group_image_alt || speaker.name;
  image.width = 827;
  image.height = 421;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

export function matchesSession(schedule, session, selectedCategories, query) {
  const categoryMatch = !selectedCategories.size || selectedCategories.has(session.category);
  const term = normalize(query);
  if (!term) return categoryMatch;
  const category = schedule.categories[session.category];
  const people = (schedule.speakers || []).filter(speaker =>
    (speaker.photos || []).some(photo => (session.photos || []).includes(photo)) ||
    (speaker.session && normalize(speaker.session) === normalize(session.title)),
  );
  const haystack = normalize([session.title, session.who, category?.en || "", session.category || "",
    ...people.flatMap(speaker => [speaker.name, ...(speaker.search_aliases || [])]),
  ].join(" "));
  return categoryMatch && term.split(/\s+/).every(word => haystack.includes(word));
}

function createProfileFace(schedule, photo) {
  const speakerIndex = schedule.speakers.findIndex(s => s.photos?.includes(photo));
  const image = createFaceImage(photo, "session-avatar");
  if (speakerIndex < 0) return image;
  const button = element("button", "profile-face");
  button.type = "button";
  button.dataset.speakerIndex = speakerIndex;
  button.setAttribute("aria-label", `View profile for ${schedule.speakers[speakerIndex].name}`);
  button.append(image);
  return button;
}

function renderLounge(schedule, day) {
  const host = document.querySelector("#lounge-info");
  host.replaceChildren();
  const bus = schedule.event.bus_reservations?.[day];
  if (bus) {
    const card = element("aside", "service-card bus-service");
    card.setAttribute("aria-label", "Bus reservations");
    const banner = element("div", "service-banner");
    const image = document.createElement("img");
    image.src = "assets/bus-booking-banner.png";
    image.alt = "Bus booked? Reserve your seat and check your departure point and time.";
    image.width = 705; image.height = 577; image.loading = "lazy";
    banner.append(image);
    const content = element("div", "service-content");
    const links = element("div", "service-links");
    for (const date of schedule.event.dates) {
      const reservations = schedule.event.bus_reservations?.[date];
      if (!reservations) continue;
      const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(date + "T00:00:00+09:00"));
      for (const [direction, slug, label] of [["outbound", reservations.outbound_slug, "Outbound"], ["return", reservations.return_slug, "Return"]]) {
        if (!slug) continue;
        const link = createBusLink(schedule, slug, date, direction);
        link.className = "service-book-link";
        link.textContent = `${dateLabel} · ${label}`;
        links.append(link);
      }
    }
    content.append(links); card.append(banner, content); host.append(card);
  }
  const lounge = schedule.event.lounge;
  if (!lounge) return;
  const aside = element("aside", "lounge-card service-card");
  aside.setAttribute("aria-labelledby", "lounge-title");
  const imageLink = element("a", "lounge-image-link service-banner");
  imageLink.href = lounge.purchase_url;
  imageLink.target = "_blank";
  imageLink.rel = "noopener noreferrer";
  imageLink.setAttribute("aria-labelledby", "lounge-title");
  const image = document.createElement("img");
  image.src = lounge.image;
  image.alt = "Ikigai Academy Coworking Lounge · October 1–2, 2026. View access passes.";
  image.width = 1920; image.height = 1080; image.loading = "lazy";
  imageLink.append(image);
  const details = element("div", "lounge-details service-content");
  const title = element("h3", "sr-only", lounge.name);
  title.id = "lounge-title";
  const freeLabel = element("p", "lounge-free-label", "Free access");
  const passes = element("ul", "lounge-passes");
  lounge.free_for.forEach(pass => passes.append(element("li", "", pass)));
  const link = element("a", "lounge-access-link", `2-Day Access · €${lounge.price_eur.toFixed(2)}`);
  link.href = lounge.purchase_url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  details.append(title, freeLabel, passes, link);
  aside.append(imageLink, details);
  host.append(aside);
}

// Column widths prioritize readable short sessions, not duration. Exact times stay visible.
export function buildTimelineLayout(sessions) {
  const timed = sessions.filter(s => s.presentation !== "invitation" && parseTimeRange(s._displayTime || s.time));
  const starts = new Set(timed.map(s => parseTimeRange(s._displayTime || s.time).start));
  const points = [...new Set(timed.flatMap(s => {
    const range = parseTimeRange(s._displayTime || s.time);
    return range.end === null ? [range.start] : [range.start, range.end];
  }))].sort((a, b) => a - b);
  // A final open-ended card gets space, without inventing an end time.
  const widths = points.map(point => starts.has(point) ? 240 : 40);
  const offsets = points.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
  return { points, widths, offsets, sessions: timed };
}

function renderHorizontalTimeline(schedule, day, sessions) {
  const layout = buildTimelineLayout(sessions);
  const wrapper = element("div", "horizontal-program");
  const controls = element("div", "timeline-controls");
  const scroller = element("div", "timeline-scroll");
  scroller.tabIndex = 0;
  scroller.setAttribute("role", "region");
  scroller.setAttribute("aria-label", "Schedule by time and room");
  const move = amount => scroller.scrollBy({ left: amount, behavior: "auto" });
  const focusSession = session => {
    const card = scroller.querySelector(`#${sessionId(session)}`);
    if (!card) return;
    const start = parseTimeRange(session._displayTime || session.time).start;
    const index = layout.points.indexOf(start);
    const headerHeight = scroller.querySelector(".axis-corner")?.offsetHeight || 74;
    scroller.scrollTo({ left: layout.offsets[index], top: Math.max(0, card.offsetTop - headerHeight - 6), behavior: "instant" });
  };
  const firstWorkshop = layout.sessions.find(s => s.kind === "workshop");
  for (const [label, action] of [
    ["Earlier", () => move(-Math.max(200, scroller.clientWidth - 92))],
    ["Later", () => move(Math.max(200, scroller.clientWidth - 92))],
    ["Start of day", () => focusSession(layout.sessions[0])],
    ["Workshops", () => focusSession(firstWorkshop || layout.sessions[0])],
    ["Afternoon", () => focusSession(layout.sessions.find(s => s.kind === "workshop" && parseTimeRange(s.time).start >= 12 * 60) || layout.sessions[0])],
  ]) {
    const button = element("button", "", label);
    button.type = "button";
    button.addEventListener("click", action);
    controls.append(button);
  }
  scroller.addEventListener("keydown", event => {
    if (event.target !== scroller) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault(); move(event.key === "ArrowRight" ? 272 : -272);
    }
  });
  const grid = element("div", "horizontal-grid");
  grid.style.gridTemplateColumns = `92px ${layout.widths.map(w => `${w}px`).join(" ")}`;
  grid.append(element("div", "axis-corner", "Room / JST"));
  layout.points.forEach((point, i) => {
    const tick = element("div", `axis-time${layout.widths[i] < 100 ? " axis-time--gap" : ""}`, clockLabel(point));
    tick.style.gridColumn = String(i + 2);
    tick.style.gridRow = "1";
    tick.dataset.minute = point;
    tick.dataset.offset = layout.offsets[i];
    grid.append(tick);
  });
  const rooms = ROOM_ORDER.filter(room => !["MAIN", "BEACH", "OUT"].includes(room) && (sessions.some(s => (s.room === room || (s.room === "MAIN" && ["A", "B"].includes(room))) && s.presentation !== "invitation") || (room === "LOUNGE" && day === schedule.event.dates[1])));
  rooms.forEach((room, index) => {
    const row = index + 2;
    const roomLabels = { MAIN: "Main hall", A: "Ballroom A", B: "Ballroom B", G: "Garden", LOUNGE: "Lounge", BEACH: "Grand beach", OUT: "Off-site" };
    const label = element("div", "axis-room", roomLabels[room] || schedule.rooms[room] || room);
    label.style.gridRow = String(row);
    grid.append(label);
    const roomSessions = layout.sessions.filter(s => s.room === room || (s.room === "MAIN" && room === "A") || (s.room === "ALL" && index === 0));
    if (!roomSessions.length && room === "LOUNGE") {
      const pending = element("p", "timeline-pending", "Morning sessions to be confirmed.");
      pending.style.gridRow = String(row);
      pending.style.gridColumn = "2 / span 2";
      grid.append(pending);
    }
    roomSessions.forEach(session => {
      const range = parseTimeRange(session._displayTime || session.time);
      const start = layout.points.indexOf(range.start);
      const end = range.end === null ? start + 1 : layout.points.indexOf(range.end);
      const card = element("article", "session-card timeline-card");
      card.id = sessionId(session);
      card.dataset.sessionTitle = session.title;
      card.style.gridRow = String(row);
      if (session.room === "MAIN") {
        card.style.gridRow = `${rooms.indexOf("A") + 2} / ${rooms.indexOf("B") + 3}`;
        card.classList.add("timeline-card--combined");
      }
      if (session.room === "ALL") {
        card.style.gridRow = `2 / ${rooms.length + 2}`;
        card.classList.add("timeline-card--shared");
      }
      card.style.gridColumn = `${start + 2} / ${Math.max(start + 1, end) + 2}`;
      card.style.setProperty("--category", schedule.categories[session.category]?.color || DEFAULT_CATEGORY_COLOR);
      if (session.note === "soon") card.classList.add("session-card--soon");
      const inner = element("div", "timeline-card__inner");
      const top = element("div", "session-card__top");
      top.append(element("p", "result-time", formatTimeLabel(session._displayTime || session.time)));
      inner.append(top);
      if (session.room === "MAIN") top.append(element("p", "combined-room-label", schedule.rooms.MAIN));
      if (session.room === "ALL") inner.append(element("p", "", "All venues"));
      if (session.note === "soon") inner.append(element("span", "soon-badge", "Coming soon"));
      const heading = element("h3", "");
      const title = element("button", "timeline-title", session.title);
      title.type = "button";
      title.dataset.sessionIndex = session._index;
      title.setAttribute("aria-label", `View details: ${session.title}`);
      heading.append(title);
      inner.append(heading);
      const people = element("div", "session-avatars");
      (session.photos || []).slice(0, 4).forEach(photo => people.append(createProfileFace(schedule, photo)));
      inner.append(people);
      inner.append(element("p", "timeline-who", session.who || ""));
      if (session.title === "Bus Transportation" && schedule.event.bus_reservations?.[day]) {
        inner.append(createBusLink(schedule, schedule.event.bus_reservations[day].return_slug, day, "return"));
      } else if (session.community_slug) {
        const link = element("a", "book-link", "Book Your Seat");
        link.href = bookingUrl(schedule.event.booking_base, session.community_slug);
        link.target = "_blank"; link.rel = "noopener noreferrer";
        inner.append(link);
      }
      card.append(inner); grid.append(card);
    });
  });
  const now = element("div", "timeline-now-line");
  now.hidden = true;
  now.setAttribute("aria-hidden", "true");
  grid.append(now);
  scroller.append(grid);
  wrapper.append(controls, scroller);
  // Begin at the parallel program, not an empty room before workshops start.
  window.requestAnimationFrame(() => {
    if (scroller.isConnected && firstWorkshop) focusSession(firstWorkshop);
  });
  return wrapper;
}

export function renderSessionDetails(schedule, session) {
  const content = document.querySelector("#session-dialog-content");
  const card = createSessionCard(schedule, session, new Set(), "");
  card.removeAttribute("id");
  card.prepend(element("p", "result-time", `${formatLongDay(session.day)} · ${formatTimeLabel(session._displayTime || session.time)} JST`));
  content.replaceChildren(card);
  const dialog = document.querySelector("#session-dialog");
  dialog.showModal(); dialog.scrollTop = 0;
}

function clockLabel(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function createFaceImage(photo, className = "") {
  const image = document.createElement("img");
  image.className = className;
  const source = `assets/faces/${encodeURIComponent(photo)}.jpg`;
  image.src = FACE_PLACEHOLDER;
  image.dataset.src = source;
  image.alt = "";
  image.width = 600;
  image.height = 600;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => image.remove());
  if (faceObserver) {
    faceObserver.observe(image);
  } else {
    image.src = source;
    image.removeAttribute("data-src");
  }
  return image;
}

export function mergeContinuationSlots(sessions) {
  const displaySessions = sessions.map((session) => ({ ...session }));
  const hiddenIndexes = new Set();

  displaySessions
    .filter((session) => session.note === "cont")
    .forEach((continuation) => {
      const primary = findContinuationPrimary(displaySessions, continuation);
      if (!primary) return;
      primary._spanSlots = 2;
      primary._displayTime = combineTimeRanges(primary.time, continuation.time);
      hiddenIndexes.add(continuation._index);
    });

  return displaySessions.filter((session) => !hiddenIndexes.has(session._index));
}

function findContinuationPrimary(sessions, continuation) {
  const continuationStart = parseTimeRange(continuation.time)?.start ?? Infinity;
  return sessions
    .filter((candidate) => {
      const range = parseTimeRange(candidate.time);
      return (
        candidate.note !== "cont" &&
        candidate.day === continuation.day &&
        candidate.kind === continuation.kind &&
        candidate.room === continuation.room &&
        range &&
        range.start < continuationStart
      );
    })
    .sort((a, b) => parseTimeRange(b.time).start - parseTimeRange(a.time).start)[0];
}

function combineTimeRanges(primaryTime, continuationTime) {
  const primary = parseTimeRange(primaryTime);
  const continuation = parseTimeRange(continuationTime);
  if (!primary || !continuation) return primaryTime;
  const start = primaryTime.split("-")[0];
  const end = continuationTime.split("-")[1];
  return end ? `${start}-${end}` : primaryTime;
}

function groupSessionsByTime(sessions) {
  const groups = new Map();
  sessions.forEach((session) => {
    if (!groups.has(session.time)) groups.set(session.time, []);
    groups.get(session.time).push(session);
  });

  return [...groups.entries()]
    .map(([time, entries]) => ({ time, sessions: entries }))
    .sort((a, b) => (parseTimeRange(a.time)?.start ?? 9999) - (parseTimeRange(b.time)?.start ?? 9999));
}

function isWorkshopGrid(sessions) {
  return sessions.length > 1 && sessions.every((session) => session.kind === "workshop");
}

function isWorkshopGroup(group) {
  return group.sessions.length > 0 && group.sessions.every((session) => session.kind === "workshop");
}

function compareRooms(a, b) {
  return ROOM_ORDER.indexOf(a.room) - ROOM_ORDER.indexOf(b.room);
}

export function sessionId(session) {
  return `session-${session.day}-${session._index}`;
}

function bookingUrl(base, slug) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return new URL(slug.replace(/^\/+/, ""), normalizedBase).href;
}

function normalize(value = "") {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\p{L}]+/gu, " ")
    .trim();
}

function element(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}
