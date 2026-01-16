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

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const taskGenerators = [
  () => {
    const a = randomInt(7, 18);
    const b = randomInt(3, 14);
    const c = randomInt(2, 9);
    return {
      question: `Solve: (${a} + ${b}) × ${c}`,
      answer: (a + b) * c
    };
  },
  () => {
    const a = randomInt(4, 12);
    const b = randomInt(6, 15);
    const c = randomInt(10, 30);
    return {
      question: `What is ${a} × ${b} + ${c}?`,
      answer: a * b + c
    };
  },
  () => {
    const start = randomInt(3, 15);
    const step = randomInt(2, 7);
    return {
      question: `Find the next number: ${start}, ${start + step}, ${start + step * 2}, ?`,
      answer: start + step * 3
    };
  },
  () => {
    const total = randomInt(30, 90);
    const percent = randomInt(10, 40);
    const answer = Math.round((total * percent) / 100);
    return {
      question: `What is ${percent}% of ${total} (round to a whole number)?`,
      answer
    };
  }
];

const generateTask = () => {
  const generator = taskGenerators[randomInt(0, taskGenerators.length - 1)];
  return generator();
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
    feedback.textContent = "Correct! You have 1 minute for this domain.";
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
