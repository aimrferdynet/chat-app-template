/**
 * AI Mr Ferdy
 * Chat AI Online Bahasa Indonesia
 *
 * Frontend Chat Controller
 *
 * API:
 * POST /api/chat
 */

"use strict";

/* =========================================================
   DOM
========================================================= */

const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const historyEl = document.getElementById("history");
const newChatButton = document.getElementById("new-chat");
const clearButton = document.getElementById("clear");
const menuButton = document.getElementById("menu");
const sidebar = document.getElementById("sidebar");

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "ai-mr-ferdy-chat-history-v1";
const CURRENT_CHAT_KEY = "ai-mr-ferdy-current-chat-v1";

/* =========================================================
   STATE
========================================================= */

let chatHistory = [];
let currentChatId = null;
let isProcessing = false;

/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeChat();
  setupTextarea();
  setupButtons();
  setupPromptButtons();
  setupMobileMenu();
});

/* =========================================================
   CHAT INITIALIZATION
========================================================= */

function initializeChat() {
  const savedCurrentChat = localStorage.getItem(CURRENT_CHAT_KEY);

  if (savedCurrentChat) {
    try {
      const parsed = JSON.parse(savedCurrentChat);

      if (
        parsed &&
        parsed.id &&
        Array.isArray(parsed.messages) &&
        parsed.messages.length > 0
      ) {
        currentChatId = parsed.id;
        chatHistory = parsed.messages;

        renderMessages();
        renderHistory();

        return;
      }
    } catch (error) {
      console.error("Gagal memuat percakapan:", error);
    }
  }

  startNewChat(false);
}

/* =========================================================
   NEW CHAT
========================================================= */

function startNewChat(saveHistory = true) {
  if (saveHistory && chatHistory.length > 1) {
    saveCurrentChat();
  }

  currentChatId = generateId();

  chatHistory = [
    {
      role: "assistant",
      content:
        "Halo! Saya AI Mr Ferdy. Ada yang bisa saya bantu hari ini?",
    },
  ];

  saveCurrentChatToCurrentStorage();

  renderMessages();
  renderHistory();

  if (userInput) {
    userInput.value = "";
    userInput.style.height = "auto";
    userInput.focus();
  }

  closeMobileSidebar();
}

/* =========================================================
   SAVE CURRENT CHAT
========================================================= */

function saveCurrentChat() {
  if (!currentChatId || !chatHistory.length) {
    return;
  }

  const allChats = getSavedChats();

  const existingIndex = allChats.findIndex(
    (chat) => chat.id === currentChatId
  );

  const chatObject = {
    id: currentChatId,

    createdAt:
      existingIndex >= 0
        ? allChats[existingIndex].createdAt
        : Date.now(),

    updatedAt: Date.now(),

    messages: chatHistory,

    title: generateChatTitle(chatHistory),
  };

  if (existingIndex >= 0) {
    allChats[existingIndex] = chatObject;
  } else {
    allChats.unshift(chatObject);
  }

  const limitedChats = allChats.slice(0, 50);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(limitedChats)
  );

  saveCurrentChatToCurrentStorage();
}

/* =========================================================
   SAVE CURRENT CHAT ONLY
========================================================= */

function saveCurrentChatToCurrentStorage() {
  if (!currentChatId) {
    return;
  }

  localStorage.setItem(
    CURRENT_CHAT_KEY,
    JSON.stringify({
      id: currentChatId,
      messages: chatHistory,
    })
  );
}

/* =========================================================
   GET SAVED CHATS
========================================================= */

function getSavedChats() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Gagal membaca riwayat chat:", error);

    return [];
  }
}

/* =========================================================
   LOAD CHAT
========================================================= */

function loadChat(chatId) {
  if (isProcessing) {
    return;
  }

  const chats = getSavedChats();

  const selectedChat = chats.find(
    (chat) => chat.id === chatId
  );

  if (!selectedChat) {
    return;
  }

  currentChatId = selectedChat.id;

  chatHistory = Array.isArray(selectedChat.messages)
    ? selectedChat.messages
    : [];

  saveCurrentChatToCurrentStorage();

  renderMessages();
  renderHistory();

  if (userInput) {
    userInput.value = "";
    userInput.style.height = "auto";
    userInput.focus();
  }

  closeMobileSidebar();
}

/* =========================================================
   CLEAR CURRENT CHAT
========================================================= */

function clearCurrentChat() {
  if (isProcessing) {
    return;
  }

  const confirmed = window.confirm(
    "Hapus percakapan ini?"
  );

  if (!confirmed) {
    return;
  }

  const chats = getSavedChats();

  const filteredChats = chats.filter(
    (chat) => chat.id !== currentChatId
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(filteredChats)
  );

  startNewChat(false);
}

/* =========================================================
   RENDER MESSAGES
========================================================= */

function renderMessages() {
  if (!chatMessages) {
    return;
  }

  chatMessages.innerHTML = "";

  const hasUserMessage = chatHistory.some(
    (message) => message.role === "user"
  );

  /*
   * Jika belum ada pesan user,
   * tampilkan welcome screen.
   */

  if (!hasUserMessage) {
    renderWelcomeScreen();
  }

  chatHistory.forEach((message) => {
    renderMessageElement(
      message.role,
      message.content
    );
  });

  updateWelcomeVisibility();
  scrollToBottom();
}

/* =========================================================
   WELCOME SCREEN
========================================================= */

function renderWelcomeScreen() {
  if (!chatMessages) {
    return;
  }

  const welcome = document.createElement("div");

  welcome.className = "welcome";
  welcome.id = "welcome-screen";

  welcome.innerHTML = `
    <div class="welcome-logo">F</div>

    <h1>Ada yang bisa saya bantu?</h1>

    <p>
      Tanya apa saja ke AI Mr Ferdy. Mulai dari mencari ide,
      menulis artikel, coding, belajar, sampai membantu berbagai
      pekerjaan sehari-hari.
    </p>

    <div class="prompt-grid">

      <button
        class="prompt"
        type="button"
        data-prompt="Bantu saya membuat ide konten yang menarik untuk website."
      >
        💡 Berikan saya ide konten
      </button>

      <button
        class="prompt"
        type="button"
        data-prompt="Bantu saya membuat artikel SEO yang natural dan mudah dibaca."
      >
        ✍️ Buat artikel SEO
      </button>

      <button
        class="prompt"
        type="button"
        data-prompt="Bantu saya membuat atau memperbaiki kode JavaScript."
      >
        💻 Bantu coding
      </button>

      <button
        class="prompt"
        type="button"
        data-prompt="Jelaskan sebuah topik dengan bahasa Indonesia yang mudah dipahami."
      >
        📚 Jelaskan sesuatu
      </button>

    </div>
  `;

  chatMessages.appendChild(welcome);

  setupPromptButtons();
}

/* =========================================================
   RENDER SINGLE MESSAGE
========================================================= */

function renderMessageElement(role, content) {
  if (!chatMessages) {
    return null;
  }

  const messageEl = document.createElement("div");

  messageEl.className =
    role === "user"
      ? "message user-message"
      : "message assistant-message";

  const p = document.createElement("p");

  p.textContent = content;

  messageEl.appendChild(p);
  chatMessages.appendChild(messageEl);

  return messageEl;
}

/* =========================================================
   ADD MESSAGE
========================================================= */

function addMessageToChat(role, content) {
  const messageEl = renderMessageElement(
    role,
    content
  );

  scrollToBottom();

  updateWelcomeVisibility();

  return messageEl;
}

/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {
  if (!userInput || !sendButton) {
    return;
  }

  const message = userInput.value.trim();

  if (!message || isProcessing) {
    return;
  }

  isProcessing = true;

  userInput.disabled = true;
  sendButton.disabled = true;

  hideWelcome();

  /*
   * Tambahkan pesan user ke tampilan.
   */

  addMessageToChat("user", message);

  /*
   * Tambahkan ke history API.
   */

  chatHistory.push({
    role: "user",
    content: message,
  });

  /*
   * Bersihkan input.
   */

  userInput.value = "";
  userInput.style.height = "auto";

  /*
   * Simpan percakapan.
   */

  saveCurrentChat();

  /*
   * Tampilkan indikator mengetik.
   */

  showTyping();

  try {
    /*
     * Buat bubble assistant kosong.
     */

    const assistantMessageEl =
      document.createElement("div");

    assistantMessageEl.className =
      "message assistant-message";

    const assistantTextEl =
      document.createElement("p");

    assistantMessageEl.appendChild(
      assistantTextEl
    );

    chatMessages.appendChild(
      assistantMessageEl
    );

    scrollToBottom();

    /*
     * Request ke backend.
     */

    const response = await fetch("/api/chat", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        messages: chatHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `API request gagal: ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error(
        "Response body tidak tersedia."
      );
    }

    /*
     * Baca streaming response.
     */

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder("utf-8");

    let responseText = "";
    let buffer = "";
    let sawDone = false;

    const flushAssistantText = () => {
      assistantTextEl.textContent =
        responseText;

      scrollToBottom();
    };

    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        const parsed =
          consumeSseEvents(
            buffer + "\n\n"
          );

        for (const data of parsed.events) {
          if (data === "[DONE]") {
            sawDone = true;
            break;
          }

          const content =
            extractContent(data);

          if (content) {
            responseText += content;
            flushAssistantText();
          }
        }

        break;
      }

      buffer += decoder.decode(
        value,
        {
          stream: true,
        }
      );

      const parsed =
        consumeSseEvents(buffer);

      buffer = parsed.buffer;

      for (const data of parsed.events) {
        if (data === "[DONE]") {
          sawDone = true;
          buffer = "";
          break;
        }

        const content =
          extractContent(data);

        if (content) {
          responseText += content;

          flushAssistantText();
        }
      }

      if (sawDone) {
        break;
      }
    }

    /*
     * Simpan jawaban AI.
     */

    if (responseText.length > 0) {
      chatHistory.push({
        role: "assistant",
        content: responseText,
      });

      saveCurrentChat();
    } else {
      assistantMessageEl.remove();
    }

    renderHistory();

  } catch (error) {
    console.error(
      "Kesalahan Chat API:",
      error
    );

    /*
     * Hapus bubble kosong.
     */

    const emptyAssistant =
      chatMessages.querySelector(
        ".assistant-message:last-child"
      );

    if (
      emptyAssistant &&
      !emptyAssistant.textContent.trim()
    ) {
      emptyAssistant.remove();
    }

    /*
     * Pesan error Bahasa Indonesia.
     */

    const errorMessage =
      "Maaf, terjadi kesalahan saat memproses permintaan. Silakan coba lagi.";

    addMessageToChat(
      "assistant",
      errorMessage
    );

    chatHistory.push({
      role: "assistant",
      content: errorMessage,
    });

    saveCurrentChat();

  } finally {
    hideTyping();

    isProcessing = false;

    userInput.disabled = false;
    sendButton.disabled = false;

    userInput.focus();

    scrollToBottom();
  }
}

/* =========================================================
   EXTRACT STREAM CONTENT
========================================================= */

function extractContent(data) {
  if (!data || data === "[DONE]") {
    return "";
  }

  try {
    const jsonData = JSON.parse(data);

    /*
     * Cloudflare Workers AI
     */

    if (
      typeof jsonData.response === "string" &&
      jsonData.response.length > 0
    ) {
      return jsonData.response;
    }

    /*
     * OpenAI-style streaming
     */

    if (
      typeof jsonData.choices?.[0]?.delta?.content ===
      "string"
    ) {
      return jsonData.choices[0].delta.content;
    }

    /*
     * OpenAI completion-style
     */

    if (
      typeof jsonData.choices?.[0]?.text ===
      "string"
    ) {
      return jsonData.choices[0].text;
    }

    return "";

  } catch (error) {
    console.error(
      "Gagal membaca SSE:",
      data,
      error
    );

    return "";
  }
}

/* =========================================================
   SSE PARSER
========================================================= */

function consumeSseEvents(buffer) {
  let normalized =
    buffer.replace(/\r/g, "");

  const events = [];

  let eventEndIndex;

  while (
    (eventEndIndex =
      normalized.indexOf("\n\n")) !== -1
  ) {
    const rawEvent =
      normalized.slice(
        0,
        eventEndIndex
      );

    normalized =
      normalized.slice(
        eventEndIndex + 2
      );

    const lines =
      rawEvent.split("\n");

    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLines.push(
          line
            .slice("data:".length)
            .trimStart()
        );
      }
    }

    if (dataLines.length === 0) {
      continue;
    }

    events.push(
      dataLines.join("\n")
    );
  }

  return {
    events,
    buffer: normalized,
  };
}

/* =========================================================
   TEXTAREA
========================================================= */

function setupTextarea() {
  if (!userInput) {
    return;
  }

  userInput.addEventListener(
    "input",
    function () {
      this.style.height = "auto";

      this.style.height =
        Math.min(
          this.scrollHeight,
          180
        ) + "px";
    }
  );

  userInput.addEventListener(
    "keydown",
    function (e) {
      if (
        e.key === "Enter" &&
        !e.shiftKey
      ) {
        e.preventDefault();

        sendMessage();
      }
    }
  );
}

/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {
  if (sendButton) {
    sendButton.addEventListener(
      "click",
      sendMessage
    );
  }

  if (newChatButton) {
    newChatButton.addEventListener(
      "click",
      () => startNewChat(true)
    );
  }

  if (clearButton) {
    clearButton.addEventListener(
      "click",
      clearCurrentChat
    );
  }
}

/* =========================================================
   PROMPT BUTTONS
========================================================= */

function setupPromptButtons() {
  const prompts =
    document.querySelectorAll(
      ".prompt[data-prompt]"
    );

  prompts.forEach((button) => {

    /*
     * Hindari event listener ganda.
     */

    if (
      button.dataset.listenerAttached ===
      "true"
    ) {
      return;
    }

    button.dataset.listenerAttached =
      "true";

    button.addEventListener(
      "click",
      () => {
        const prompt =
          button.dataset.prompt;

        if (
          !prompt ||
          isProcessing ||
          !userInput
        ) {
          return;
        }

        userInput.value = prompt;

        userInput.style.height =
          "auto";

        userInput.style.height =
          Math.min(
            userInput.scrollHeight,
            180
          ) + "px";

        userInput.focus();

        sendMessage();
      }
    );
  });
}

/* =========================================================
   HISTORY
========================================================= */

function renderHistory() {
  if (!historyEl) {
    return;
  }

  historyEl.innerHTML = "";

  const chats = getSavedChats();

  const validChats = chats.filter(
    (chat) =>
      Array.isArray(chat.messages) &&
      chat.messages.some(
        (message) =>
          message.role === "user"
      )
  );

  if (validChats.length === 0) {
    const empty =
      document.createElement("div");

    empty.style.cssText =
      "padding:10px 8px;color:#9ca3af;font-size:12px;";

    empty.textContent =
      "Belum ada percakapan.";

    historyEl.appendChild(empty);

    return;
  }

  /*
   * Kelompok history.
   */

  const groups = {
    today: [],
    yesterday: [],
    previous7: [],
    older: [],
  };

  validChats.forEach((chat) => {
    const date = new Date(
      chat.updatedAt ||
      chat.createdAt ||
      Date.now()
    );

    const group =
      getDateGroup(date);

    groups[group].push(chat);
  });

  appendHistoryGroup(
    "Hari Ini",
    groups.today
  );

  appendHistoryGroup(
    "Kemarin",
    groups.yesterday
  );

  appendHistoryGroup(
    "7 Hari Terakhir",
    groups.previous7
  );

  appendHistoryGroup(
    "Lebih Lama",
    groups.older
  );
}

/* =========================================================
   HISTORY GROUP
========================================================= */

function appendHistoryGroup(
  title,
  chats
) {
  if (
    !historyEl ||
    chats.length === 0
  ) {
    return;
  }

  const group =
    document.createElement("div");

  group.className =
    "history-group";

  const titleEl =
    document.createElement("div");

  titleEl.className =
    "history-title";

  titleEl.textContent =
    title;

  group.appendChild(
    titleEl
  );

  chats.forEach((chat) => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "history-item";

    if (
      chat.id === currentChatId
    ) {
      button.classList.add(
        "active"
      );
    }

    button.textContent =
      chat.title ||
      generateChatTitle(
        chat.messages
      );

    button.title =
      button.textContent;

    button.addEventListener(
      "click",
      () => loadChat(chat.id)
    );

    group.appendChild(button);
  });

  historyEl.appendChild(group);
}

/* =========================================================
   DATE GROUP
========================================================= */

function getDateGroup(date) {
  const now = new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const target =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const diff =
    today.getTime() -
    target.getTime();

  const oneDay =
    24 * 60 * 60 * 1000;

  const diffDays =
    Math.floor(
      diff / oneDay
    );

  if (diffDays <= 0) {
    return "today";
  }

  if (diffDays === 1) {
    return "yesterday";
  }

  if (diffDays <= 7) {
    return "previous7";
  }

  return "older";
}

/* =========================================================
   CHAT TITLE
========================================================= */

function generateChatTitle(messages) {
  if (!Array.isArray(messages)) {
    return "Percakapan Baru";
  }

  const firstUserMessage =
    messages.find(
      (message) =>
        message.role === "user" &&
        message.content
    );

  if (!firstUserMessage) {
    return "Percakapan Baru";
  }

  let title =
    firstUserMessage.content
      .replace(/\s+/g, " ")
      .trim();

  if (title.length > 48) {
    title =
      title.substring(0, 48) +
      "…";
  }

  return title;
}

/* =========================================================
   WELCOME VISIBILITY
========================================================= */

function updateWelcomeVisibility() {
  const welcomeScreen =
    document.getElementById(
      "welcome-screen"
    );

  if (!welcomeScreen) {
    return;
  }

  const hasUserMessage =
    chatHistory.some(
      (message) =>
        message.role === "user"
    );

  welcomeScreen.style.display =
    hasUserMessage
      ? "none"
      : "";
}

/* =========================================================
   HIDE WELCOME
========================================================= */

function hideWelcome() {
  const welcomeScreen =
    document.getElementById(
      "welcome-screen"
    );

  if (!welcomeScreen) {
    return;
  }

  welcomeScreen.style.display =
    "none";
}

/* =========================================================
   TYPING INDICATOR
========================================================= */

function showTyping() {
  if (!typingIndicator) {
    return;
  }

  typingIndicator.classList.add(
    "visible"
  );
}

function hideTyping() {
  if (!typingIndicator) {
    return;
  }

  typingIndicator.classList.remove(
    "visible"
  );
}

/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {
  if (!chatMessages) {
    return;
  }

  requestAnimationFrame(() => {
    chatMessages.scrollTop =
      chatMessages.scrollHeight;
  });
}

/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {
  if (
    !menuButton ||
    !sidebar
  ) {
    return;
  }

  menuButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      sidebar.classList.toggle(
        "open"
      );
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      if (
        window.innerWidth > 760
      ) {
        return;
      }

      if (
        !sidebar.classList.contains(
          "open"
        )
      ) {
        return;
      }

      const clickedInsideSidebar =
        sidebar.contains(
          event.target
        );

      const clickedMenu =
        menuButton.contains(
          event.target
        );

      if (
        !clickedInsideSidebar &&
        !clickedMenu
      ) {
        closeMobileSidebar();
      }
    }
  );
}

/* =========================================================
   CLOSE MOBILE SIDEBAR
========================================================= */

function closeMobileSidebar() {
  if (!sidebar) {
    return;
  }

  sidebar.classList.remove(
    "open"
  );
}

/* =========================================================
   GENERATE CHAT ID
========================================================= */

function generateId() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .substring(2, 9)
  );
}

/* =========================================================
   SAVE BEFORE LEAVING
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    if (chatHistory.length > 1) {
      saveCurrentChat();
    }
  }
);
