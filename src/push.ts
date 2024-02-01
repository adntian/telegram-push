import Env from "./env";
import { snedMessage } from "./tgapi";


function isNumeric(value: string) {
    return /^\d+$/.test(value);
}

export async function push(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "GET" && request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
    }

    if (await env.db.get("INSTALL") !== "TRUE") {
        return new Response("not installed", { status: 400 });
    }

		let params = new URL(request.url).searchParams;
		let fullkey, msg;
		if (request.method === "POST") {
			params = await request.json();
			// @ts-ignore
			fullkey = params.key;
			// @ts-ignore
			msg = params.msg;
		} else {
			fullkey = params.get("key");
			msg = params.get("msg");
		}
    // validate key
    if (msg === null || msg === "") {
        return new Response("empty message", { status: 400 });
    }

    if (fullkey === null || fullkey === "") {
        return new Response("unauthorized: empty key", { status: 401 });
    }

    // format: [chat id]:[push key]
    const splits = fullkey.split("-");
    if (splits.length !== 2) {
        return new Response("unauthorized: wrong format", { status: 401 });
    }

    if (!isNumeric(splits[0])) {
        return new Response("unauthorized: invalid chat id", { status: 401 });
    }

    const chatid = Number.parseInt(splits[0]);
    const key = splits[1];

    if (await env.db.get("CHAT-" + chatid) !== key) {
        return new Response("unauthorized: invalid key", { status: 401 });
    }

    // send message
    await snedMessage(await env.db.get("TG_KEY") || "", chatid, msg || "");

    return new Response("ok");
}
