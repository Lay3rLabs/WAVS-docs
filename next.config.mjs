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
};

export default withMDX(config);
