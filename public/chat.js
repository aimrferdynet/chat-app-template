/**
 * AI Mr Ferdy - LLM Chat App
 * Frontend Chat Controller
 *
 * Compatible with:
 * - #chat-messages
 * - #user-input
 * - #send-button
 * - #typing-indicator
 * - #history
 * - #new-chat
 * - #clear
 * - .prompt[data-prompt]
 *
 * API:
 * POST /api/chat
 */

"use strict";

/* =========================================================
   DOM ELEMENTS
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

const welcomeScreen = document.getElementById("welcome-screen");


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "ai-mr-ferdy-chat-history-v1";
const CURRENT_CHAT_KEY = "ai-mr-ferdy-current-chat-v1";


/* =========================================================
   CHAT STATE
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
   INITIALIZE CHAT
========================================================= */

function initializeChat() {
	const savedCurrentChat = localStorage.getItem(CURRENT_CHAT_KEY);

	if (savedCurrentChat) {
		try {
			const parsed = JSON.parse(savedCurrentChat);

			if (
				parsed &&
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
			console.error("Failed to load current chat:", error);
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
				"Hello! I'm AI Mr Ferdy. How can I help you today?",
		},
	];

	localStorage.setItem(
		CURRENT_CHAT_KEY,
		JSON.stringify({
			id: currentChatId,
			messages: chatHistory,
		}),
	);

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
	if (!currentChatId || !chatHistory.length) return;

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

	// Keep latest 50 chats
	const limitedChats = allChats.slice(0, 50);

	localStorage.setItem(
		STORAGE_KEY,
		JSON.stringify(limitedChats)
	);

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

		if (!data) return [];

		const parsed = JSON.parse(data);

		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		console.error("Failed to read chat history:", error);
		return [];
	}
}


/* =========================================================
   LOAD CHAT
========================================================= */

function loadChat(chatId) {
	if (isProcessing) return;

	const chats = getSavedChats();

	const selectedChat = chats.find(
		(chat) => chat.id === chatId
	);

	if (!selectedChat) return;

	currentChatId = selectedChat.id;

	chatHistory = Array.isArray(selectedChat.messages)
		? selectedChat.messages
		: [];

	localStorage.setItem(
		CURRENT_CHAT_KEY,
		JSON.stringify({
			id: currentChatId,
			messages: chatHistory,
		})
	);

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
   DELETE / CLEAR CURRENT CHAT
========================================================= */

function clearCurrentChat() {
	if (isProcessing) return;

	const confirmed = window.confirm(
		"Clear this conversation?"
	);

	if (!confirmed) return;

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
	if (!chatMessages) return;

	chatMessages.innerHTML = "";

	chatHistory.forEach((message) => {
		renderMessageElement(
			message.role,
			message.content
		);
	});

	scrollToBottom();

	updateWelcomeVisibility();
}


/* =========================================================
   RENDER SINGLE MESSAGE
========================================================= */

function renderMessageElement(role, content) {
	if (!chatMessages) return null;

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
	if (!userInput || !sendButton) return;

	const message = userInput.value.trim();

	if (!message || isProcessing) return;

	isProcessing = true;

	userInput.disabled = true;
	sendButton.disabled = true;

	/* Hide welcome */
	hideWelcome();

	/* Add user message */
	addMessageToChat("user", message);

	/* Add to history */
	chatHistory.push({
		role: "user",
		content: message,
	});

	/* Reset input */
	userInput.value = "";
	userInput.style.height = "auto";

	/* Save immediately */
	saveCurrentChat();

	/* Show typing */
	showTyping();

	try {
		/*
		 * Create assistant message element.
		 * We don't add it to chatHistory yet because
		 * the response is still streaming.
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

		/* API request */

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
				`API request failed: ${response.status}`
			);
		}

		if (!response.body) {
			throw new Error(
				"Response body is null"
			);
		}

		/* Streaming */

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
				/*
				 * Process remaining buffer.
				 */
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
				{ stream: true }
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
		 * Save completed assistant response.
		 */

		if (responseText.length > 0) {
			chatHistory.push({
				role: "assistant",
				content: responseText,
			});

			saveCurrentChat();
		} else {
			/*
			 * Remove empty assistant message
			 * if API returned nothing.
			 */

			assistantMessageEl.remove();
		}

		renderHistory();

	} catch (error) {
		console.error(
			"Chat API error:",
			error
		);

		/*
		 * Remove empty assistant element.
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

		addMessageToChat(
			"assistant",
			"Sorry, there was an error processing your request. Please try again."
		);

		chatHistory.push({
			role: "assistant",
			content:
				"Sorry, there was an error processing your request. Please try again.",
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
		 * Cloudflare Workers AI format:
		 * { "response": "hello" }
		 */

		if (
			typeof jsonData.response ===
				"string" &&
			jsonData.response.length > 0
		) {
			return jsonData.response;
		}

		/*
		 * OpenAI compatible format:
		 * choices[0].delta.content
		 */

		if (
			typeof jsonData.choices?.[0]?.delta
				?.content === "string"
		) {
			return jsonData.choices[0].delta.content;
		}

		/*
		 * Some APIs return:
		 * choices[0].text
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
			"Error parsing SSE data:",
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
	let normalized = buffer.replace(/\r/g, "");

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
	if (!userInput) return;

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
			() => {
				startNewChat(true);
			}
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
		button.addEventListener(
			"click",
			() => {
				const prompt =
					button.dataset.prompt;

				if (!prompt || isProcessing) {
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

				/*
				 * Send immediately
				 */

				sendMessage();
			}
		);
	});
}


/* =========================================================
   HISTORY
========================================================= */

function renderHistory() {
	if (!historyEl) return;

	historyEl.innerHTML = "";

	const chats = getSavedChats();

	/*
	 * Don't show empty / invalid chats.
	 */

	const validChats = chats.filter(
		(chat) =>
			Array.isArray(chat.messages) &&
			chat.messages.some(
				(message) =>
					message.role === "user"
			)
	);

	if (validChats.length === 0) {
		const empty = document.createElement(
			"div"
		);

		empty.style.cssText =
			"padding:10px 8px;color:#9ca3af;font-size:12px;";

		empty.textContent =
			"No conversations yet.";

		historyEl.appendChild(empty);

		return;
	}

	const groups = {
		today: [],
		yesterday: [],
		previous7: [],
		older: [],
	};

	validChats.forEach((chat) => {
		const date =
			new Date(
				chat.updatedAt ||
					chat.createdAt ||
					Date.now()
			);

		const group =
			getDateGroup(date);

		groups[group].push(chat);
	});

	appendHistoryGroup(
		"Today",
		groups.today
	);

	appendHistoryGroup(
		"Yesterday",
		groups.yesterday
	);

	appendHistoryGroup(
		"Previous 7 Days",
		groups.previous7
	);

	appendHistoryGroup(
		"Older",
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
	if (!historyEl || chats.length === 0) {
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

	titleEl.textContent = title;

	group.appendChild(titleEl);

	chats.forEach((chat) => {
		const button =
			document.createElement("button");

		button.type = "button";

		button.className =
			"history-item";

		if (
			chat.id === currentChatId
		) {
			button.classList.add("active");
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
			() => {
				loadChat(chat.id);
			}
		);

		group.appendChild(button);
	});

	historyEl.appendChild(group);
}


/* =========================================================
   DATE GROUPING
========================================================= */

function getDateGroup(date) {
	const now = new Date();

	const today = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate()
	);

	const target = new Date(
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
		return "New conversation";
	}

	const firstUserMessage =
		messages.find(
			(message) =>
				message.role === "user" &&
				message.content
		);

	if (!firstUserMessage) {
		return "New conversation";
	}

	let title =
		firstUserMessage.content
			.replace(/\s+/g, " ")
			.trim();

	/*
	 * Limit sidebar title
	 */

	if (title.length > 48) {
		title =
			title.substring(0, 48) +
			"…";
	}

	return title;
}


/* =========================================================
   WELCOME SCREEN
========================================================= */

function updateWelcomeVisibility() {
	if (!welcomeScreen) return;

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


function hideWelcome() {
	if (!welcomeScreen) return;

	welcomeScreen.style.display =
		"none";
}


/* =========================================================
   TYPING INDICATOR
========================================================= */

function showTyping() {
	if (!typingIndicator) return;

	typingIndicator.classList.add(
		"visible"
	);
}


function hideTyping() {
	if (!typingIndicator) return;

	typingIndicator.classList.remove(
		"visible"
	);
}


/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {
	if (!chatMessages) return;

	requestAnimationFrame(() => {
		chatMessages.scrollTop =
			chatMessages.scrollHeight;
	});
}


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

function setupMobileMenu() {
	if (!menuButton || !sidebar) {
		return;
	}

	menuButton.addEventListener(
		"click",
		() => {
			sidebar.classList.toggle(
				"open"
			);
		}
	);

	/*
	 * Close sidebar when clicking outside.
	 */

	document.addEventListener(
		"click",
		(e) => {
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
				sidebar.contains(e.target);

			const clickedMenu =
				menuButton.contains(e.target);

			if (
				!clickedInsideSidebar &&
				!clickedMenu
			) {
				closeMobileSidebar();
			}
		}
	);
}


function closeMobileSidebar() {
	if (!sidebar) return;

	sidebar.classList.remove("open");
}


/* =========================================================
   GENERATE UNIQUE ID
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
   BEFORE PAGE UNLOAD
========================================================= */

window.addEventListener(
	"beforeunload",
	() => {
		if (
			chatHistory.length > 1
		) {
			saveCurrentChat();
		}
	}
);
