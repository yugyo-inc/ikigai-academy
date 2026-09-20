// Live countdown to the Ikigai Academy opening: October 1, 2026, 09:00 JST.
const TARGET_TIME = new Date("2026-10-01T09:00:00+09:00").getTime();

export function initTicketCountdown(rootId = "ticket-countdown") {
  const root = document.querySelector(`#${rootId}`);
  if (!root) return;

  const daysEl = root.querySelector("#cd-days");
  const hoursEl = root.querySelector("#cd-hours");
  const minsEl = root.querySelector("#cd-mins");
  const secsEl = root.querySelector("#cd-secs");
  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

  let intervalId = null;

  function tick() {
    const diff = TARGET_TIME - Date.now();

    if (diff <= 0) {
      if (intervalId) window.clearInterval(intervalId);
      const started = document.createElement("p");
      started.className = "ticket-nudge__started";
      started.textContent = "Ikigai Academy has begun!";
      root.replaceWith(started);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days).padStart(2, "0");
    hoursEl.textContent = String(hours).padStart(2, "0");
    minsEl.textContent = String(minutes).padStart(2, "0");
    secsEl.textContent = String(seconds).padStart(2, "0");
  }

  tick();
  intervalId = window.setInterval(tick, 1_000);
}
