import { getCollection } from "astro:content";
import rss from "@astrojs/rss";

export async function GET(context: any) {
	const blog = await getCollection("posts");

	// Filter for English posts only and extract the slug without language prefix
	const englishPosts = blog
		.filter((post) => {
			const [lang] = post.slug.split("/");
			return lang === "en";
		})
		.map((post) => {
			const [, ...slugParts] = post.slug.split("/");
			return {
				...post,
				cleanSlug: slugParts.join("/"),
			};
		});

	return rss({
		title: "BARGHEST Blog",
		description: "Open-source security research, threat intelligence, and digital rights",
		site: context.site,
		items: englishPosts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.pubDate,
			description: post.data.description,
			author: post.data.author.name,
			categories: post.data.tags,
			// Compute RSS link from post `slug` without language prefix
			link: `/research/${post.cleanSlug}/`,
		})),
		customData: `<language>en-us</language>`,
	});
}
