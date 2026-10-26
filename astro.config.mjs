import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	vite: {
		server: {
			watch: {
				usePolling: true,
			},
			fs: {
				allow: ["..", "../mintaka/node_modules"],
			},
		},
	},
	site: "https://barghest.asia",
	i18n: {
		defaultLocale: "en",
		locales: ["en", "cn", "ru"],
	},
	markdown: {
		drafts: true,
		shikiConfig: {
			theme: "css-variables",
		},
	},
	shikiConfig: {
		wrap: true,
		skipInline: false,
		drafts: true,
	},
	integrations: [
		tailwind({
			applyBaseStyles: false,
		}),
		sitemap({
			filter: (page) => {
				const pathname = new URL(page).pathname;
				const isIndexableRussianTranslation = pathname === "/ru/research/pbap-device-seizure-sorm/";
				return (
					!pathname.startsWith("/cn/") &&
					(!pathname.startsWith("/ru/") || isIndexableRussianTranslation) &&
					!["/404/", "/thank-you/", "/mesh/privacy/", "/escalation/"].includes(pathname)
				);
			},
		}),
		mdx(),
		icon(),
	],
});
