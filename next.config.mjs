import { remarkCodeHike, recmaCodeHike } from "codehike/mdx";
import createMDX from "fumadocs-mdx/config";
import remarkEditOnGithub from "./remark-edit-on-github.js";

/** @type {import('codehike/mdx').CodeHikeConfig} */
const chConfig = {
  components: {
    code: "Code",
    inlineCode: "MyInlineCode",
  },
  syntaxHighlighting: {
    theme: "min-dark",
  },
};

const withMDX = createMDX({
  mdxOptions: {
    remarkPlugins: [
      [remarkCodeHike, chConfig],
      [
        remarkEditOnGithub,
        { repoBasePath: "https://github.com/Lay3rLabs/WAVS-docs/edit/main/" },
      ],
    ],
    recmaPlugins: [[recmaCodeHike, chConfig]],
    jsx: true,
  },
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  
  // Add rewrite rules for LLM access and markdown
  async rewrites() {
    return [
      // Primary LLM endpoint - accessible at /llms-full.txt
      {
        source: '/llms-full.txt',
        destination: '/api/llms-full',
      },
      // All paths with .md extension
      {
        source: '/:path*(.md)',
        destination: '/api/md/:path*',
      },
    ];
  },
};

export default withMDX(config);
