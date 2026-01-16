const BLOCKLIST_KEY = "blocklist";

const subdomainInput = document.getElementById("subdomain");
const categoryInput = document.getElementById("category");
const ruleIdInput = document.getElementById("rule-id");
const ruleForm = document.getElementById("rule-form");
const ruleList = document.getElementById("rule-list");
const ruleCount = document.getElementById("rule-count");
const cancelButton = document.getElementById("cancel-button");
const exportButton = document.getElementById("export-button");
const importFile = document.getElementById("import-file");

const getBlocklist = async () => {
  const data = await chrome.storage.local.get({ [BLOCKLIST_KEY]: [] });
  return data.blocklist;
};

const saveBlocklist = async (blocklist) => {
  await chrome.storage.local.set({ [BLOCKLIST_KEY]: blocklist });
};

const resetForm = () => {
  subdomainInput.value = "";
  categoryInput.value = "";
  ruleIdInput.value = "";
};

const renderList = async () => {
  const blocklist = await getBlocklist();
  ruleCount.textContent = `${blocklist.length} rules`;
  ruleList.innerHTML = "";

  if (blocklist.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No subdomains blocked yet.";
    empty.classList.add("hint");
    ruleList.appendChild(empty);
    return;
  }

  const grouped = blocklist.reduce((acc, entry) => {
    const key = entry.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  Object.entries(grouped)
    .sort()
    .forEach(([category, entries]) => {
      const group = document.createElement("div");
      group.className = "rule-group";
      const heading = document.createElement("h3");
      heading.textContent = category;
      group.appendChild(heading);

      entries
        .sort((a, b) => a.subdomain.localeCompare(b.subdomain))
        .forEach((entry) => {
          const item = document.createElement("div");
          item.className = "rule-item";

          const label = document.createElement("span");
          label.textContent = entry.subdomain;

          const controls = document.createElement("div");

          const editButton = document.createElement("button");
          editButton.textContent = "Edit";
          editButton.addEventListener("click", () => {
            subdomainInput.value = entry.subdomain;
            categoryInput.value = entry.category || "";
            ruleIdInput.value = entry.id;
          });

          const deleteButton = document.createElement("button");
          deleteButton.textContent = "Delete";
          deleteButton.className = "delete";
          deleteButton.addEventListener("click", async () => {
            const updated = blocklist.filter((item) => item.id !== entry.id);
            await saveBlocklist(updated);
            await renderList();
          });

          controls.appendChild(editButton);
          controls.appendChild(deleteButton);

          item.appendChild(label);
          item.appendChild(controls);
          group.appendChild(item);
        });

      ruleList.appendChild(group);
    });
};

ruleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const subdomain = subdomainInput.value.trim().toLowerCase();
  if (!subdomain) return;

  const category = categoryInput.value.trim();
  const blocklist = await getBlocklist();
  const existingIndex = blocklist.findIndex((entry) => entry.id === ruleIdInput.value);

  if (existingIndex >= 0) {
    blocklist[existingIndex] = {
      ...blocklist[existingIndex],
      subdomain,
      category
    };
  } else {
    blocklist.push({
      id: crypto.randomUUID(),
      subdomain,
      category
    });
  }

  await saveBlocklist(blocklist);
  resetForm();
  await renderList();
});

cancelButton.addEventListener("click", () => resetForm());

exportButton.addEventListener("click", async () => {
  const blocklist = await getBlocklist();
  const blob = new Blob([JSON.stringify(blocklist, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "focus-guard-blocklist.json";
  link.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Invalid JSON");
    const normalized = parsed
      .filter((entry) => entry.subdomain)
      .map((entry) => ({
        id: entry.id || crypto.randomUUID(),
        subdomain: String(entry.subdomain).trim().toLowerCase(),
        category: entry.category ? String(entry.category).trim() : ""
      }));
    await saveBlocklist(normalized);
    await renderList();
  } catch (error) {
    // eslint-disable-next-line no-alert
    alert("Import failed. Please provide valid JSON.");
  }
  importFile.value = "";
});

renderList();
