import {
  formatDateRange,
  formatDayTab,
  formatLongDay,
  formatTimeLabel,
  parseTimeRange,
} from "./tokyo-time.js";

const ROOM_ORDER = ["MAIN", "A", "B", "G", "BEACH", "OUT"];
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

export function renderSchedule(schedule, selectedDay, selectedCategories, query = "") {
  const timeline = document.querySelector("#timeline");
  const dateLabel = document.querySelector("#schedule-date");
  const status = document.querySelector("#filter-status");
  const sessions = schedule.sessions.filter((session) => session.day === selectedDay);
  const displaySessions = mergeContinuationSlots(sessions);

  dateLabel.textContent = formatLongDay(selectedDay);
  timeline.setAttribute(
    "aria-labelledby",
    schedule.event.dates.indexOf(selectedDay) === 0 ? "day-tab-1" : "day-tab-2",
  );
  timeline.replaceChildren();

  if (schedule.event.before_program) {
    const note = element("p", "before-program", schedule.event.before_program);
    timeline.append(note);
  }

  const groups = groupSessionsByTime(displaySessions);
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

  if (!groups.length) {
    timeline.append(element("p", "now-empty", "No sessions are listed for this day."));
  }

  const highlighted = displaySessions.filter((session) => matchesSession(schedule, session, selectedCategories, query)).length;
  status.textContent = selectedCategories.size || query.trim()
    ? `${highlighted} matching sessions highlighted. All other sessions remain visible.`
    : "All sessions are shown at full emphasis.";
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
    speaker.photos.slice(0, 2).forEach((photo) => {
      portrait.append(createFaceImage(photo));
    });

    card.append(portrait);
    card.append(element("span", "speaker-name", speaker.name));
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
  speaker.photos.slice(0, 2).forEach((photo) => portrait.append(createFaceImage(photo)));
  const copy = element("div", "speaker-dialog__copy");
  copy.append(element("p", "speaker-dialog__eyebrow", speaker.role || "Ikigai Academy Co-Creator"));
  const heading = element("h2", "", speaker.name);
  heading.id = "speaker-dialog-title";
  copy.append(heading);
  if (speaker.bio) copy.append(element("p", "speaker-dialog__bio", speaker.bio));
  if (speaker.session) copy.append(element("p", "speaker-dialog__session", speaker.session));
  if (speaker.when) copy.append(element("p", "speaker-dialog__when", speaker.when));

  const target = findSpeakerSession(schedule, speaker, selectedDay);
  if (target) {
    const button = element("button", "primary-button", "View session in program");
    button.type = "button";
    button.addEventListener("click", () => {
      dialog.close();
      onFindSession(speaker);
    });
    copy.append(button);
  } else {
    copy.append(element("p", "speaker-dialog__unlisted", "No session is listed for this person on October 1–2."));
  }
  content.append(portrait, copy);
  dialog.showModal();
}

export function findSpeakerSession(schedule, speaker, selectedDay) {
  const photoKeys = new Set(speaker.photos || []);
  const speakerSession = normalize(speaker.session);
  const candidates = schedule.sessions.filter((session) => {
    if (session.note === "cont") return false;
    const photoMatch = (session.photos || []).some((photo) => photoKeys.has(photo));
    const sessionTitle = normalize(session.title);
    const titleMatch =
      speakerSession.length > 3 &&
      (sessionTitle.includes(speakerSession) || speakerSession.includes(sessionTitle));
    return photoMatch || titleMatch;
  });

  const preferred = candidates.find((session) => session.day === selectedDay);
  return preferred || candidates[0] || null;
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
    session.photos.forEach((photo) => avatars.append(createFaceImage(photo, "session-avatar")));
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

  if (session.community_slug) {
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

function matchesSession(schedule, session, selectedCategories, query) {
  const categoryMatch = !selectedCategories.size || selectedCategories.has(session.category);
  const term = normalize(query);
  if (!term) return categoryMatch;
  const category = schedule.categories[session.category];
  const haystack = normalize([session.title, session.who, category?.en || "", session.category || ""].join(" "));
  return categoryMatch && haystack.includes(term);
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
