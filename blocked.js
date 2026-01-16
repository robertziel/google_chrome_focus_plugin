const query = new URLSearchParams(window.location.search);
const originalUrl = query.get("url");

const blockedUrl = document.getElementById("blocked-url");
const question = document.getElementById("task-question");
const answerInput = document.getElementById("task-answer");
const submitButton = document.getElementById("task-submit");
const feedback = document.getElementById("task-feedback");
const bypassInput = document.getElementById("bypass-input");
const bypassButton = document.getElementById("bypass-submit");
const bypassFeedback = document.getElementById("bypass-feedback");

const generateTask = () => {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 9) + 1;
  return {
    question: `What is ${a} + ${b}?`,
    answer: a + b
  };
};

const task = generateTask();
question.textContent = task.question;
blockedUrl.textContent = originalUrl || "Unknown URL";

const unlock = async (type) => {
  if (!originalUrl) return;
  await chrome.runtime.sendMessage({ type, url: originalUrl });
  window.location.href = originalUrl;
};

submitButton.addEventListener("click", async () => {
  const response = Number(answerInput.value);
  if (response === task.answer) {
    feedback.textContent = "Correct! You have 1 minute.";
    await unlock("grantTempAccess");
  } else {
    feedback.textContent = "Not quite. Try again.";
  }
});

bypassButton.addEventListener("click", async () => {
  const keyword = bypassInput.value.trim().toLowerCase();
  if (keyword === "resourceful") {
    bypassFeedback.textContent = "Unlocked for this exact path.";
    await unlock("grantBypassAccess");
  } else {
    bypassFeedback.textContent = "Keyword incorrect.";
  }
});
