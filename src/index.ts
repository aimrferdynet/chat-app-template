/**
 * AI Mr Ferdy - LLM Chat Application
 *
 * Cloudflare Workers AI
 * Chat AI Bahasa Indonesia
 */

import { Env, ChatMessage } from "./types";

// Model AI Cloudflare
const MODEL_ID =
	"@cf/meta/llama-3.1-8b-instruct-fp8";

// System prompt AI Mr Ferdy
const SYSTEM_PROMPT = `
Kamu adalah AI Mr Ferdy, asisten AI yang ramah, cerdas, dan membantu.

ATURAN UTAMA:
1. SELALU jawab menggunakan Bahasa Indonesia.
2. Jika pengguna bertanya dalam Bahasa Indonesia, jawaban WAJIB dalam Bahasa Indonesia.
3. Jangan menjawab dalam Bahasa Inggris kecuali pengguna secara jelas meminta Bahasa Inggris.
4. Jika pertanyaan menggunakan campuran bahasa, tetap gunakan Bahasa Indonesia sebagai bahasa utama.
5. Istilah teknis, nama produk, nama software, kode program, syntax, dan istilah khusus boleh menggunakan bahasa aslinya.
6. Jangan menerjemahkan kode program atau syntax.
7. Gunakan Bahasa Indonesia yang natural, jelas, dan mudah dipahami.
8. Sesuaikan panjang jawaban dengan kebutuhan pertanyaan.
9. Untuk coding, berikan kode yang siap digunakan dan jelaskan dengan Bahasa Indonesia.
10. Jangan menyebut diri sebagai ChatGPT. Nama kamu adalah AI Mr Ferdy.

IDENTITAS:
Kamu adalah AI Mr Ferdy dari aiMrFerdy.net.
Kamu membantu pengguna dalam Bahasa Indonesia untuk berbagai kebutuhan seperti menjawab pertanyaan, coding, menulis, SEO, ide konten, belajar, dan pekerjaan sehari-hari.

Jika pengguna secara eksplisit meminta bahasa tertentu, ikuti permintaan bahasa tersebut.
`;

/**
 * Main request handler
 */
export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// Frontend / static assets
		if (
			url.pathname === "/" ||
			!url.pathname.startsWith("/api/")
		) {
			return env.ASSETS.fetch(request);
		}

		// API Chat
		if (url.pathname === "/api/chat") {
			if (request.method === "POST") {
				return handleChatRequest(request, env);
			}

			return new Response(
				"Method not allowed",
				{
					status: 405,
				},
			);
		}

		return new Response(
			"Not found",
			{
				status: 404,
			},
		);
	},
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		const body = (await request.json()) as {
			messages?: ChatMessage[];
		};

		// Buat salinan messages agar data request asli
		// tidak dimodifikasi secara langsung.
		const messages: ChatMessage[] = Array.isArray(
			body.messages,
		)
			? [...body.messages]
			: [];

		// Tambahkan system prompt jika belum ada.
		const hasSystemPrompt = messages.some(
			(msg) => msg.role === "system",
		);

		if (!hasSystemPrompt) {
			messages.unshift({
				role: "system",
				content: SYSTEM_PROMPT,
			});
		}

		// Jalankan Cloudflare Workers AI
		const stream = await env.AI.run(
			MODEL_ID,
			{
				messages,
				max_tokens: 1024,
				stream: true,
			},
		);

		// Streaming response ke frontend
		return new Response(stream, {
			headers: {
				"content-type":
					"text/event-stream; charset=utf-8",
				"cache-control":
					"no-cache, no-transform",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error(
			"Error processing chat request:",
			error,
		);

		return new Response(
			JSON.stringify({
				error:
					"Gagal memproses permintaan. Silakan coba lagi.",
			}),
			{
				status: 500,
				headers: {
					"content-type":
						"application/json; charset=utf-8",
				},
			},
		);
	}
}
