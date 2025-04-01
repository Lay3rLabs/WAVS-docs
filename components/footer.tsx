import Image from "next/image";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="mt-8 border-t border-gray-200 dark:border-gray-700 bg-primary py-6 px-4">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-y-4 sm:gap-y-0">
        {/* Logo Section */}
        <div className="flex items-center space-x-4">
          <Image
            alt="Layer Logo"
            src="/wordmark-white.svg"
            className="dark:block hidden"
            width={200}
            height={80}
          />
          <Image
            alt="Layer Logo"
            src="/wordmark-black.svg"
            className="block dark:hidden"
            width={200}
            height={80}
          />
        </div>
        {/* Navigation Links */}
        <nav className="flex flex-wrap items-center space-x-6 text-sm">
          <Link
            href="https://github.com/Lay3rLabs"
            className="hover:text-gray-900 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </Link>
          <Link
            href="/sitemap.xml"
            className="hover:text-gray-900 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sitemap
          </Link>
          <Link
            href="https://layer.xyz"
            className="hover:text-gray-900 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Layer.xyz
          </Link>
          <Link
            href="https://apply.workable.com/layer-labs-cayman-ltd/"
            className="hover:text-gray-900 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Careers
          </Link>
          {/* Updated Social Media Links */}
          <Link
            href="https://x.com/LayerOnEth"
            className="hover:text-gray-900 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            X/Twitter
          </Link>
          <Link
            href="https://t.me/layer_xyz"
            className="hover:text-gray-900 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegram
          </Link>
          <Link
            href="https://www.linkedin.com/company/layeroneth"
            className="hover:text-gray-900 dark:hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </Link>
        </nav>
      </div>
    </footer>
  );
};
