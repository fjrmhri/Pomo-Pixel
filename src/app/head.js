const SITE_URL = "https://pomo-pixel.vercel.app";
const PREVIEW_IMAGE = `${SITE_URL}/preview/preview.png`;
const PREVIEW_IMAGE_WIDTH = "1920";
const PREVIEW_IMAGE_HEIGHT = "1200";
const TITLE =
  "Pomo Pixel – Aesthetic Pomodoro Timer with Lofi Music & Focus Stats";
const DESCRIPTION =
  "Minimalist aesthetic pomodoro timer with lofi music, focus statistics, and distraction-free UI. Built for deep work and productivity.";
const KEYWORDS =
  "pomodoro timer, aesthetic pomodoro, lofi focus timer, productivity timer, focus music, study timer";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Pomo Pixel",
  url: SITE_URL,
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
};

export default function Head() {
  return (
    <>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
      <meta name="keywords" content={KEYWORDS} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
      <meta name="theme-color" content="#0a0a0a" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="Pomo Pixel" />
      <link rel="canonical" href={SITE_URL} />
      <link rel="manifest" href="/manifest.json" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Pomo Pixel" />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:image" content={PREVIEW_IMAGE} />
      <meta property="og:image:alt" content="Pomo Pixel preview" />
      <meta property="og:image:width" content={PREVIEW_IMAGE_WIDTH} />
      <meta property="og:image:height" content={PREVIEW_IMAGE_HEIGHT} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={TITLE} />
      <meta name="twitter:description" content={DESCRIPTION} />
      <meta name="twitter:image" content={PREVIEW_IMAGE} />
      <meta name="twitter:image:alt" content="Pomo Pixel preview" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/preview/preview.png" />
    </>
  );
}
