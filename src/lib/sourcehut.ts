// Fetches recent threads from the sourcehut mailing list at build time.
// Needs SRHT_TOKEN: a meta.sr.ht personal access token limited to
// lists.sr.ht/PROFILE:RO, lists.sr.ht/LISTS:RO and lists.sr.ht/EMAILS:RO.
// Without a token, or if sourcehut is unreachable, it returns an empty list
// so the build never fails because of the mailing list.

export const LIST_OWNER = "ox0v1";
export const LIST_NAME = "BARGHEST";
export const LIST_ARCHIVE = `https://lists.sr.ht/~${LIST_OWNER}/${LIST_NAME}`;

// Threads never shown on the site (root message ids), e.g. test messages
const HIDDEN_THREADS = new Set([
	"518326", // ground control to major tom
	"518329", // Check ignition
	"518330", // this is ground control to Major Tom
	"518332", // and the papers want to know whose shirts you wear
	"518335", // and the papers want to know whose shirts you wear (with reply)
]);

export interface ListMessage {
	date: Date;
	from: string;
	body: string;
}

export interface ListThread {
	id: string;
	subject: string;
	date: Date;
	from: string;
	replies: number;
	// Page on this site, e.g. /mail/518789/
	path: string;
	// Original message in the sourcehut archive
	archiveUrl: string;
	messages: ListMessage[];
}

const query = `query ($owner: String!, $list: String!) {
	user(username: $owner) {
		list(name: $list) {
			threads {
				results {
					subject
					created
					replies
					root {
						id
						messageID
						date
						body
						from: header(want: "From")
					}
					descendants {
						results {
							id
							date
							body
							from: header(want: "From")
						}
					}
				}
			}
		}
	}
}`;

// "Ovi <ovi@example.org>" -> "Ovi". Only the display name is shown.
function displayName(from: string | undefined): string {
	if (!from) return "";
	const name = from.replace(/<[^>]*>/, "").replace(/"/g, "").trim() || from;
	// No display name: show the part before "@" so addresses never appear on the site
	return name.replace(/@.*/, "").replace(/[<>]/g, "").trim();
}

// Public addresses that may appear in a message as written
const PUBLIC_ADDRESS = /^(?:info@barghest\.asia|.+@lists\.sr\.ht)$/i;

// Same rule for message bodies: quoted "On ... Ovi <ovi@example.org> wrote:"
// lines and signatures would otherwise publish addresses.
function cleanBody(body: string | undefined): string {
	return (body ?? "")
		.replace(/\r\n/g, "\n")
		.replace(/\s*<[^<>\s]+@[^<>\s]+>/g, "")
		.replace(/[\w.+~\/-]+@[\w-]+(?:\.[\w-]+)+/g, (address) => (PUBLIC_ADDRESS.test(address) ? address : address.replace(/@.*/, "")))
		.replace(/[ \t]+$/gm, "")
		.replace(/(?:\n>)+\s*$/, "")
		.replace(/\n{3,}/g, "\n\n")
		.trimEnd();
}

function toMessage(email: any): ListMessage {
	return { date: new Date(email.date), from: displayName(email.from?.[0]), body: cleanBody(email.body) };
}

async function fetchThreads(): Promise<ListThread[]> {
	const token = import.meta.env.SRHT_TOKEN ?? process.env.SRHT_TOKEN;
	if (!token) {
		console.warn("[sourcehut] SRHT_TOKEN not set; skipping mailing list threads.");
		return [];
	}

	try {
		const res = await fetch("https://lists.sr.ht/query", {
			method: "POST",
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
			body: JSON.stringify({ query, variables: { owner: LIST_OWNER, list: LIST_NAME } }),
		});
		const json = await res.json();
		if (!res.ok || json.errors) {
			console.warn("[sourcehut] Query failed:", res.status, JSON.stringify(json.errors ?? json));
			return [];
		}

		const threads = (json.data?.user?.list?.threads?.results ?? []).filter(
			(thread: any) => !HIDDEN_THREADS.has(String(thread.root?.id)),
		);
		return threads.map((thread: any) => {
			const messageID = String(thread.root.messageID).replace(/^<|>$/g, "");
			const replies = (thread.descendants?.results ?? []).map(toMessage);
			replies.sort((a: ListMessage, b: ListMessage) => a.date.getTime() - b.date.getTime());
			return {
				id: String(thread.root.id),
				subject: thread.subject,
				date: new Date(thread.created),
				from: displayName(thread.root.from?.[0]),
				replies: thread.replies,
				path: `/mail/${thread.root.id}/`,
				// Same format sourcehut uses in its own archive links
				archiveUrl: `${LIST_ARCHIVE}/%3C${encodeURIComponent(messageID).replace(/%3D/g, "=").replace(/%40/g, "@")}%3E`,
				messages: [toMessage(thread.root), ...replies],
			};
		});
	} catch (error) {
		console.warn("[sourcehut] Could not reach lists.sr.ht:", error);
		return [];
	}
}

// One request per build, shared by the list page and every message page
let cached: Promise<ListThread[]> | undefined;

export function getAllThreads(): Promise<ListThread[]> {
	cached ??= fetchThreads();
	return cached;
}

export async function getListThreads(limit = 20): Promise<ListThread[]> {
	return (await getAllThreads()).slice(0, limit);
}
