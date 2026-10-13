const form = document.getElementById("paste-form");
const contentInput = document.getElementById("content");
const ttlInput = document.getElementById("ttl-seconds");
const maxViewsInput = document.getElementById("max-views");
const charCount = document.getElementById("char-count");
const createButton = document.getElementById("create-button");
const formError = document.getElementById("form-error");
const resultPanel = document.getElementById("result-panel");
const shareUrlInput = document.getElementById("share-url");
const copyButton = document.getElementById("copy-button");
const openPasteLink = document.getElementById("open-paste");
const copyStatus = document.getElementById("copy-status");

contentInput.addEventListener("input", () => {
  charCount.textContent = `${contentInput.value.length} characters`;
});

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = "";
  formError.hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  resultPanel.hidden = true;

  const content = contentInput.value;
  const payload = { content };

  if (ttlInput.value !== "") {
    payload.ttl_seconds = Number(ttlInput.value);
  }

  if (maxViewsInput.value !== "") {
    const maxViews = Number(maxViewsInput.value);

    if (!Number.isSafeInteger(maxViews) || maxViews < 1) {
      showError("Maximum views must be a whole number of at least 1.");
      maxViewsInput.focus();
      return;
    }

    payload.max_views = maxViews;
  }

  createButton.disabled = true;
  createButton.textContent = "Creating paste...";

  try {
    const response = await fetch("/api/pastes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Unable to create your paste.");
    }

    shareUrlInput.value = data.url;
    openPasteLink.href = data.url;
    resultPanel.hidden = false;
    copyStatus.textContent = "";
    resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    showError(
      error.message === "Failed to fetch"
        ? "Unable to reach the server. Check your connection and try again."
        : error.message
    );
  } finally {
    createButton.disabled = false;
    createButton.innerHTML = 'Create paste <span aria-hidden="true">→</span>';
  }
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    copyStatus.textContent = "Link copied to clipboard.";
    copyButton.textContent = "Copied!";
  } catch {
    shareUrlInput.focus();
    shareUrlInput.select();

    const copied = document.execCommand("copy");
    copyStatus.textContent = copied
      ? "Link copied to clipboard."
      : "Copy failed. Select and copy the link manually.";
    copyButton.textContent = copied ? "Copied!" : "Try again";
  }

  window.setTimeout(() => {
    copyButton.textContent = "Copy link";
  }, 1800);
});