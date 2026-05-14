import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			seoTitle: z.string().optional(),
			pubDate: z.date(),
			description: z.string(),
			seoDescription: z.string().optional(),
			author: z.object({
				name: z.string(),
				link: z.string(),
			}),
			image: z.object({
				source: image(),
				alt: z.string(),
			}),
			socialImage: z.string().optional(),

			tags: z.array(z.string()),
		}),
});

const projectsCollection = defineCollection({
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			pubDate: z.date(),
			description: z.string(),
			link: z.string(),
			author: z.object({
				name: z.string(),
				link: z.string(),
			}),
			image: z.object({
				source: image(),
				alt: z.string(),
			}).optional(),
			displayText: z.string().optional(),
				hideCardText: z.boolean().optional(),
				transparentBg: z.boolean().optional(),
		}),
});

const authorsCollection = defineCollection({
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			description: z.string(),
			image: z.object({
				source: image(),
				alt: z.string(),
			}),
		}),
});

export const collections = {
	posts: postsCollection,
	projects: projectsCollection,
	authors: authorsCollection,
};
