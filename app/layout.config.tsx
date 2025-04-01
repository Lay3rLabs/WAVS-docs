import { type BaseLayoutProps, type DocsLayoutProps } from "fumadocs-ui/layout"
import { pageTree } from "@/app/source"
import Image from 'next/image';

//logo
const logo = (
  <>
    <Image
      alt="Layer Logo"
      src={'/logo-wavs.png'}
      sizes="100px"
      width={100}
      height={100}
      className=" w-8 md:w-8 [.uwu_&]:block"
      aria-label="Layer"
    />
  </>
);
// wordmark
const wordmark = (
  <>
    <Image
      alt="Layer Logo"
      src={'/wordmark.svg'}
      sizes="100px"
      width={100}
      height={100}
      className=" w-24 md:w-32 [.uwu_&]:block"
      aria-label="Layer"
      />
  </>
);


// shared configuration
export const baseOptions: BaseLayoutProps = {
  nav: {
    // title: "Layer AVS Docs",
    title:
      <>
        {logo}
        {/* {wordmark} */}
        <span className="font-medium">
          WAVS Docs
        </span>
      </>
  },
}

// docs layout configuration
export const docsOptions: DocsLayoutProps = {
  ...baseOptions,
  tree: pageTree,
}


