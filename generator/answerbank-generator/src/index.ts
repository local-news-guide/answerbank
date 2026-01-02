import { DurableObject } from "cloudflare:workers";

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async sayHello(name: string): Promise<string> {
		return `Hello, ${name}!`;
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Health check
		if (url.pathname === "/health") {
			return new Response("ok");
		}

		// POST /init-folders -> creates .keep placeholders in R2
		if (url.pathname === "/init-folders" && request.method === "POST") {
			const folders = [
				"evidence/.keep",
				"evidence/plat_menterprise/.keep",
				"packs/.keep",
				"packs/all-platforms/.keep",
				"packs/plat_menterprise/.keep",
			];

			await Promise.all(folders.map((key) => env.ANSWERBANK_EVIDENCE.put(key, "keep")));

			return Response.json({ ok: true, created: folders });
		}

		// R2 endpoints:
		// PUT /r2/<key>  -> writes to R2
		// GET /r2/<key>  -> reads from R2
		if (url.pathname.startsWith("/r2/")) {
			const key = decodeURIComponent(url.pathname.slice("/r2/".length));
			if (!key) return new Response("Missing key", { status: 400 });

			if (request.method === "PUT") {
				if (!request.body) return new Response("Missing body", { status: 400 });

				await env.ANSWERBANK_EVIDENCE.put(key, request.body, {
					httpMetadata: request.headers,
				});

				return new Response(`Saved ${key}`);
			}

			if (request.method === "GET") {
				const obj = await env.ANSWERBANK_EVIDENCE.get(key);
				if (!obj) return new Response("Not found", { status: 404 });

				const headers = new Headers();
				obj.writeHttpMetadata(headers);
				headers.set("etag", obj.httpEtag);

				return new Response(obj.body, { headers });
			}

			return new Response("Method not allowed", { status: 405 });
		}

		// Existing Durable Object example (unchanged)
		const stub = env.MY_DURABLE_OBJECT.getByName("foo");
		const greeting = await stub.sayHello("world");
		return new Response(greeting);
	},
} satisfies ExportedHandler<Env>;
