import {
  findSpeakerSession,
  renderDayTabs,
  renderFilters,
  renderHeader,
  renderSchedule,
  renderSpeakerProfile,
  renderSpeakers,
  sessionId,
  mergeContinuationSlots,
  renderSessionDetails,
} from "./render.js";
import {
  getDefaultDay,
  getProgramStatus,
  getZonedParts,
  parseTimeRange,
} from "./tokyo-time.js";
import { initTicketCountdown } from "./countdown.js";

const DATA_URL = "data/ikigai_schedule.json";

const state = {
  schedule: null,
  selectedDay: null,
  selectedCategories: new Set(),
  query: "",
  view: new URLSearchParams(window.location.search).get("view") === "list" ? "list" : "timeline",
};

init();
initTicketCountdown();

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`The schedule returned HTTP ${response.status}.`);

    const schedule = await response.json();
    validateSchedule(schedule);
    loadJapaneseFont(schedule);
    schedule.sessions = schedule.sessions.map((session, index) => ({ ...session, _index: index }));

    state.schedule = schedule;
    state.selectedDay = getDefaultDay(
      schedule.event.dates,
      getZonedParts(new Date(), schedule.event.timezone),
    );

    renderStructuredData(schedule.event);
    renderHeader(schedule);
    renderAll();
    setupTabKeyboardNavigation();
    setupInteractions();
    updateNow();
    window.setInterval(updateNow, 30_000);
  } catch (error) {
    showLoadError(error);
  }
}

function renderStructuredData(event) {
  const pageUrl = "https://ikigai.colivefukuoka.com/";
  const imageUrl = `${pageUrl}assets/og-ikigai-academy-2026.jpg`;
  const description = "A two-day participant guide to the Ikigai Academy program, sessions, speakers, booking, and venue at Colive Fukuoka 2026.";
  const venueAddress = event.venue_address || event.venue;
  const addressParts = venueAddress.split(",").map((part) => part.trim());
  const cityAndPostal = addressParts.at(-2)?.match(/^(.*)\s+(\d{3}-\d{4})$/);
  const postalAddress = {
    "@type": "PostalAddress",
    streetAddress: addressParts.slice(1, -2).join(", ") || venueAddress,
    addressCountry: "JP",
  };
  if (cityAndPostal) {
    postalAddress.addressLocality = cityAndPostal[1];
    postalAddress.postalCode = cityAndPostal[2];
  }
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${event.name} | Colive Fukuoka 2026`,
        description,
        inLanguage: "en-US",
        mainEntity: { "@id": `${pageUrl}#event` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: imageUrl,
          width: 1200,
          height: 630,
        },
      },
      {
        "@type": "Event",
        "@id": `${pageUrl}#event`,
        name: event.name,
        description: "Two days of talks and workshops for Colive Fukuoka participants.",
        startDate: event.dates[0],
        endDate: event.dates.at(-1),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        image: imageUrl,
        url: pageUrl,
        location: {
          "@type": "Place",
          name: event.venue.split(",")[0],
          address: postalAddress,
        },
        organizer: {
          "@type": "Organization",
          name: "Colive Fukuoka",
          url: event.booking_base,
        },
      },
    ],
  };
  const script = document.createElement("script");
  script.id = "event-structured-data";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(structuredData);
  document.head.append(script);
}

function loadJapaneseFont(schedule) {
  const characters = [
    ...new Set(
      JSON.stringify(schedule).match(/[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/gu) || [],
    ),
  ].join("");
  if (!characters) return;

  const appendFont = () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=optional&text=${encodeURIComponent(characters)}`;
    document.head.append(link);
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(appendFont, { timeout: 2000 });
  } else {
    window.setTimeout(appendFont, 0);
  }
}

function renderAll() {
  renderDayTabs(state.schedule, state.selectedDay, selectDay);
  renderFilters(
    state.schedule.categories,
    state.selectedCategories,
    toggleCategory,
    clearCategories,
  );
  renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, state.query, state.view);
  renderSpeakers(state.schedule, openSpeakerProfile);
}

function selectDay(day) {
  if (day === state.selectedDay) return;
  state.selectedDay = day;
  renderDayTabs(state.schedule, state.selectedDay, selectDay);
  renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, state.query, state.view);
  updateNow();
  document.querySelector("#schedule").scrollIntoView({ block: "start" });
}

function toggleCategory(category) {
  if (state.selectedCategories.has(category)) {
    state.selectedCategories.delete(category);
  } else {
    state.selectedCategories.add(category);
  }

  renderFilters(
    state.schedule.categories,
    state.selectedCategories,
    toggleCategory,
    clearCategories,
  );
  renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, state.query, state.view);
  updateNow();
}

function clearCategories() {
  state.selectedCategories.clear();
  renderFilters(
    state.schedule.categories,
    state.selectedCategories,
    toggleCategory,
    clearCategories,
  );
  renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, state.query, state.view);
  updateNow();
}

function openSpeakerProfile(speaker) {
  renderSpeakerProfile(state.schedule, speaker, state.selectedDay, goToSpeakerSession);
}

function goToSpeakerSession(speaker, selectedSession) {
  const target = selectedSession || findSpeakerSession(state.schedule, speaker, state.selectedDay);
  if (!target) return;

  // A profile link should reveal its session even when an unrelated search is active.
  state.query = "";
  state.selectedCategories.clear();
  document.querySelector("#program-search").value = "";

  if (target.day !== state.selectedDay) {
    state.selectedDay = target.day;
    renderDayTabs(state.schedule, state.selectedDay, selectDay);
  }

  renderFilters(state.schedule.categories, state.selectedCategories, toggleCategory, clearCategories);
  renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, state.query, state.view);
  updateNow();

  window.requestAnimationFrame(() => {
    const card = document.getElementById(sessionId(target));
    if (!card) return;
    card.scrollIntoView({ block: "center" });
    card.setAttribute("tabindex", "-1");
    card.focus({ preventScroll: true });
  });
}

function updateNow() {
  if (!state.schedule) return;
  const programStatus = getProgramStatus(state.schedule, new Date());
  const clock = document.querySelector("#venue-clock");
  clock.textContent = `Venue time: ${programStatus.nowParts.clock} JST`;
  clock.dateTime = `${programStatus.nowParts.date}T${programStatus.nowParts.clock}:00+09:00`;
  const currentIds = new Set(
    programStatus.type === "current"
      ? programStatus.sessions.map((session) => sessionId(resolveCurrentPrimary(session)))
      : [],
  );
  document.querySelectorAll(".session-card").forEach((card) => {
    const current = currentIds.has(card.id);
    card.classList.toggle("is-current", current);
    card.querySelector(".current-badge")?.remove();
    if (current) {
      const badge = document.createElement("span");
      badge.className = "current-badge";
      badge.textContent = "Happening now";
      card.querySelector(".session-card__top")?.append(badge);
    }
  });
  document.querySelector("#jump-to-current").hidden = !document.querySelector("#timeline .session-card.is-current");
  const nowLine = document.querySelector(".timeline-now-line");
  if (nowLine) {
    const ticks = [...document.querySelectorAll(".axis-time")];
    const minute = programStatus.nowParts.minuteOfDay;
    const i = ticks.findLastIndex(tick => Number(tick.dataset.minute) <= minute);
    const first = Number(ticks[0]?.dataset.minute);
    const last = Number(ticks.at(-1)?.dataset.minute);
    nowLine.hidden = programStatus.nowParts.date !== state.selectedDay || minute < first || minute > last || i < 0;
    if (!nowLine.hidden) {
      const tick = ticks[i];
      const next = ticks[i + 1];
      const fraction = next ? (minute - Number(tick.dataset.minute)) / (Number(next.dataset.minute) - Number(tick.dataset.minute)) : 0;
      nowLine.style.left = `${92 + Number(tick.dataset.offset) + fraction * tick.getBoundingClientRect().width}px`;
    }
  }
}

function resolveCurrentPrimary(session) {
  if (session.note !== "cont") return session;
  const candidates = state.schedule.sessions.filter((item) =>
    item.day === session.day && item.room === session.room && item.kind === session.kind && item.note !== "cont" &&
    parseTimeRange(item.time)?.start < parseTimeRange(session.time)?.start,
  );
  return candidates.at(-1) || session;
}

function setupInteractions() {
  const search = document.querySelector("#program-search");
  const expandSearch = () => {
    search.scrollIntoView({ block: "center", behavior: "instant" });
    search.focus({ preventScroll: true });
  };
  document.querySelector("#menu-search").addEventListener("click", expandSearch);
  document.querySelector("#clear-search").addEventListener("click", () => {
    state.query = ""; search.value = ""; state.selectedCategories.clear();
    renderFilters(state.schedule.categories, state.selectedCategories, toggleCategory, clearCategories);
    renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, "", state.view);
    updateNow(); search.focus({ preventScroll: true });
  });
  for (const view of ["list", "timeline"]) {
    document.querySelector(`#view-${view}`).addEventListener("click", () => {
      state.view = view;
      if (view === "timeline") {
        state.query = ""; search.value = ""; state.selectedCategories.clear();
        renderFilters(state.schedule.categories, state.selectedCategories, toggleCategory, clearCategories);
      }
      renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, state.query, view);
      updateNow();
    });
  }
  document.addEventListener("click", event => {
    const face = event.target.closest("[data-speaker-index]");
    if (face) {
      document.querySelector("#session-dialog").close();
      openSpeakerProfile(state.schedule.speakers[Number(face.dataset.speakerIndex)]);
    }
    const detail = event.target.closest("[data-session-index]");
    if (detail) {
      const session = mergeContinuationSlots(state.schedule.sessions).find(s => s._index === Number(detail.dataset.sessionIndex));
      if (session) renderSessionDetails(state.schedule, session);
    }
  });
  document.querySelector("#session-dialog-close").addEventListener("click", () => document.querySelector("#session-dialog").close());
  document.querySelector("#session-dialog").addEventListener("click", event => {
    if (event.target.id === "session-dialog") event.target.close();
  });
  document.querySelectorAll(".site-menu a").forEach(link => link.addEventListener("click", () => {
    const target = document.querySelector(link.getAttribute("href"));
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }));
  search.addEventListener("input", () => {
    state.query = search.value;
  renderSchedule(state.schedule, state.selectedDay, state.selectedCategories, state.query, state.view);
    updateNow();
  });
  document.querySelector("#jump-to-current").addEventListener("click", () => {
    document.querySelector(".session-card.is-current")?.scrollIntoView({ block: "center" });
  });
  document.querySelector("#speaker-dialog-close").addEventListener("click", () => {
    document.querySelector("#speaker-dialog").close();
  });
  document.querySelector("#speaker-dialog").addEventListener("click", (event) => {
    if (event.target.id === "speaker-dialog") event.target.close();
  });
  document.querySelector("#copy-code").addEventListener("click", () => copyText("CLF26", "#code-copy-status"));
  document.querySelector("#copy-address").addEventListener("click", () =>
    copyText(state.schedule.event.venue_address, "#address-copy-status"),
  );
}

async function copyText(value, statusSelector) {
  const status = document.querySelector(statusSelector);
  try {
    await navigator.clipboard.writeText(value);
    status.textContent = "Copied";
  } catch {
    status.textContent = "Copy unavailable here. Select and copy the text above.";
  }
}

function setupTabKeyboardNavigation() {
  const tablist = document.querySelector("#day-tabs");
  tablist.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(current + direction + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });
}

function validateSchedule(schedule) {
  const problems = [];
  if (!schedule?.event) problems.push("event is missing");
  if (!Array.isArray(schedule?.event?.dates) || schedule.event.dates.length !== 2) {
    problems.push("event.dates must contain Day 1 and Day 2");
  }
  if (schedule?.event?.timezone !== "Asia/Tokyo") problems.push("event.timezone must be Asia/Tokyo");
  if (!schedule?.categories || Object.keys(schedule.categories).length !== 5) {
    problems.push("five categories are required");
  }
  if (!schedule?.rooms || !Object.keys(schedule.rooms).length) problems.push("rooms are missing");
  if (!Array.isArray(schedule?.sessions)) problems.push("sessions are missing");
  if (!Array.isArray(schedule?.speakers)) problems.push("speakers are missing");

  (schedule?.sessions || []).forEach((session, index) => {
    if (!parseTimeRange(session.time)) problems.push(`sessions[${index}].time is invalid`);
    if (!schedule.event.dates.includes(session.day)) problems.push(`sessions[${index}].day is invalid`);
    if (!schedule.rooms[session.room]) problems.push(`sessions[${index}].room is invalid`);
    if (session.category && !schedule.categories[session.category]) {
      problems.push(`sessions[${index}].category is invalid`);
    }
  });

  if (problems.length) throw new Error(`Schedule data needs attention: ${problems.join("; ")}`);
}

function showLoadError(error) {
  const message = document.createElement("p");
  message.className = "error-message";
  message.textContent = "The program could not be loaded. Check data/ikigai_schedule.json and reload the page.";

  const timeline = document.querySelector("#timeline");
  timeline.replaceChildren(message);
  console.error(error);
}
