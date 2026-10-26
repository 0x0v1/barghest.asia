// Fetches recent threads from the sourcehut mailing list at build time.
// Needs SRHT_TOKEN: a meta.sr.ht personal access token limited to
// lists.sr.ht/PROFILE:RO, lists.sr.ht/LISTS:RO and lists.sr.ht/EMAILS:RO.
// Without a token, or if sourcehut is unreachable, it returns an empty list
// so the build never fails because of the mailing list.

export const LIST_OWNER = "ox0v1";
export const LIST_NAME = "BARGHEST";
export const LIST_ARCHIVE = `https://lists.sr.ht/~${LIST_OWNER}/${LIST_NAME}`;

export interface ListThread {
	subject: string;
	date: Date;
	from: string;
	replies: number;
	url: string;
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
						messageID
						from: header(want: "From")
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

export async function getListThreads(limit = 20): Promise<ListThread[]> {
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

		const threads = json.data?.user?.list?.threads?.results ?? [];
		return threads.slice(0, limit).map((thread: any) => {
			const messageID = String(thread.root.messageID).replace(/^<|>$/g, "");
			return {
				subject: thread.subject,
				date: new Date(thread.created),
				from: displayName(thread.root.from?.[0]),
				replies: thread.replies,
				// Same format sourcehut uses in its own archive links
				url: `${LIST_ARCHIVE}/%3C${encodeURIComponent(messageID).replace(/%3D/g, "=").replace(/%40/g, "@")}%3E`,
			};
		});
	} catch (error) {
		console.warn("[sourcehut] Could not reach lists.sr.ht:", error);
		return [];
	}
}
