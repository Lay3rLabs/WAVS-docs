# WAVS Docs

Welcome to the official documentation for WAVS, a WASI AVS runtime for streamlined AVS development.

Live site: https://docs.wavs.xyz/

## Build Locally

```bash
npm i
npm run dev
```

## Link Checking

To check for broken links in the documentation:

```
npm run check-links
```

This command will:
1. Kill any existing server on port 3000
2. Start a new dev server
3. Check all internal links
4. Kill the server when done

The link checker is also integrated into the build process (`npm run build`), ensuring no broken links make it to production.

These docs were created using [Fumadocs](https://fumadocs.vercel.app/docs/ui).

## Updating the theme

This site is built with [Fumadocs](https://fumadocs.vercel.app/docs/ui/theme). To update the theme, navigate to `tailwind.config.js`, and `global.css`. Styles are generated/applied by the tailwind config, which references the variables defined in the global CSS file.

Because the actual class names are generated by Fumadocs, you'll have to overwrite/"extend" the variables you want to change, and play around with what does what. They are loosely based on [shad/cn](https://ui.shadcn.com/docs/theming)'s theming, which may be a good reference.

## Docs components

### Callouts

```mdx
import { Callout } from 'fumadocs-ui/components/callout';
<Callout title="Info" type="info">
  Hello World
</Callout>

<Callout title="Error" type="error">
  Hello World
</Callout>

<Callout title="Warn" type="warn">
  Hello World
</Callout>
```

### Cards

```mdx
import {Layers, Microscope } from 'lucide-react';

<Cards>
  <Card
    icon={<Layers />}
    href="/about"
    title="About"
    description="Learn about WAVS"
  />
    <Card
    icon={<Microscope />}
    href="/how-it-works"
    title="How it works"
    description="Discover how WAVS works"
  />
</Cards>

```

### Tabs

```mdx
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';

<Tabs items={['Javascript', 'Rust']}>
  <Tab value="Javascript">Javascript is weird</Tab>
  <Tab value="Rust">Rust is fast</Tab>
</Tabs>
```
