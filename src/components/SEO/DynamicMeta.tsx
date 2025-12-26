import { useEffect } from "react";

interface DynamicMetaProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "music.song" | "video.other" | "profile";
  audio?: string;
  siteName?: string;
}

/**
 * Component to dynamically update Open Graph and Twitter meta tags
 * for better social media sharing previews
 */
export const DynamicMeta = ({
  title = "FUN Play: Web3 AI Social",
  description = "The place where every soul turns value into digital assets forever – Rich Rich Rich",
  image = "https://lovable.dev/opengraph-image-p98pqg.png",
  url,
  type = "website",
  audio,
  siteName = "FUN Play",
}: DynamicMetaProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
      }
      if (meta) {
        meta.setAttribute("content", content);
      } else {
        meta = document.createElement("meta");
        if (property.startsWith("og:")) {
          meta.setAttribute("property", property);
        } else {
          meta.setAttribute("name", property);
        }
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
      }
    };

    // Update Open Graph tags
    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:image", image);
    updateMetaTag("og:type", type);
    updateMetaTag("og:site_name", siteName);
    
    if (url) {
      updateMetaTag("og:url", url);
    }

    // For music type, add audio-specific meta
    if (type === "music.song" && audio) {
      updateMetaTag("og:audio", audio);
      updateMetaTag("og:audio:type", "audio/mpeg");
    }

    // Update Twitter Card tags
    updateMetaTag("twitter:card", image ? "summary_large_image" : "summary");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:image", image);

    // Cleanup on unmount - restore defaults
    return () => {
      document.title = "FUN Play: Web3 AI Social";
      updateMetaTag("og:title", "FUN Play: Web3 AI Social");
      updateMetaTag("og:description", "The place where every soul turns value into digital assets forever – Rich Rich Rich");
      updateMetaTag("og:image", "https://lovable.dev/opengraph-image-p98pqg.png");
      updateMetaTag("og:type", "website");
    };
  }, [title, description, image, url, type, audio, siteName]);

  return null;
};
