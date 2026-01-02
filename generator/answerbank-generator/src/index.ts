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

		// Packs API
		// POST /packs         -> store a context pack JSON in R2
		// GET  /packs/<id>    -> fetch a stored pack
		// GET  /packs         -> list packs (prefix packs/)
		if (url.pathname === "/packs" && request.method === "POST") {
			let body: any;
try {
  const raw = await request.text();
  const cleaned = raw.replace(/^\uFEFF/, "").trim(); // strip UTF-8 BOM if present
  body = JSON.parse(cleaned);
} catch (e) {
  return new Response(
    `Invalid JSON body: ${(e as Error).message}`,
    { status: 400 }
  );
}
			const packId = body?.pack_metadata?.pack_id;
			if (!packId || typeof packId !== "string") {
				return new Response("Missing pack_metadata.pack_id", { status: 400 });
			}

			const key = `packs/${packId}.json`;
			const json = JSON.stringify(body, null, 2);

			await env.ANSWERBANK_EVIDENCE.put(key, json, {
				httpMetadata: { contentType: "application/json; charset=utf-8" },
			});

			return Response.json({ ok: true, key, pack_id: packId });
		}

		if (url.pathname === "/packs" && request.method === "GET") {
			const listed = await env.ANSWERBANK_EVIDENCE.list({ prefix: "packs/", limit: 100 });

			return Response.json({
				ok: true,
				count: listed.objects.length,
				objects: listed.objects.map((o) => ({
					key: o.key,
					size: o.size,
					etag: o.etag,
					uploaded: o.uploaded,
				})),
			});
		}

		if (url.pathname.startsWith("/packs/") && request.method === "GET") {
			const packId = decodeURIComponent(url.pathname.slice("/packs/".length));
			if (!packId) return new Response("Missing pack id", { status: 400 });

			// Support both /packs/pack_xxx and /packs/pack_xxx.json
			const key = packId.endsWith(".json") ? `packs/${packId}` : `packs/${packId}.json`;

			const obj = await env.ANSWERBANK_EVIDENCE.get(key);
			if (!obj) return new Response("Not found", { status: 404 });

			const headers = new Headers();
			obj.writeHttpMetadata(headers);
			headers.set("etag", obj.httpEtag);

			return new Response(obj.body, { headers });
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
