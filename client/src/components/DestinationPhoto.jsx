import { useEffect, useState } from "react";
import { api } from "../lib/api";

const articleBySlug = {
  "manila-intramuros": "Intramuros",
  baguio: "Baguio",
  vigan: "Vigan",
  batanes: "Batanes",
  baler: "Baler, Aurora",
  tagaytay: "Tagaytay",
  "el-nido": "El Nido, Palawan",
  coron: "Coron, Palawan",
  "albay-mayon": "Mayon",
  boracay: "Boracay",
  siquijor: "Siquijor",
  cebu: "Cebu City",
  "bohol-panglao": "Chocolate Hills",
  "kalanggaman-leyte": "Kalanggaman Island",
  zamboanga: "Zamboanga City",
  camiguin: "Camiguin",
  "davao-samal": "Samal, Davao del Norte",
  "lake-sebu": "Lake Sebu",
  siargao: "Siargao",
  "tawi-tawi": "Tawi-Tawi",
};

const memory = new Map();
const localPhotos = {
  "davao-samal": "/assets/samal-pearl-farm.jpg",
  baguio: "/assets/baguio-burnham-park-small.jpg",
  cebu: "/assets/cebu-magellans-cross.jpg",
  "el-nido": "/assets/palawan-hero.webp",
  boracay: "/assets/boracay-white-beach.jpg",
  batanes: "/assets/batanes-rolling-hills.jpg",
  siargao: "/assets/siargao-island.jpg",
};
const localDescriptions = {
  "davao-samal": "Island coastline at Pearl Farm, Samal Island, Davao",
  baguio: "Swan boats on Burnham Park Lake in Baguio",
  cebu: "Magellan's Cross beneath the painted pavilion ceiling in Cebu",
};
const isScenicPhoto = (url) => !/(?:logo|seal[_%\s-]|flag[_%\s-]|coat[_%\s-]|\.svg)/i.test(url);

function destinationArticle(trip) {
  return (
    articleBySlug[trip?.destination?.slug] ||
    trip?.destination?.name ||
    trip?.customLocation ||
    "Tourism in the Philippines"
  );
}

async function resolvePhoto(article) {
  if (memory.has(article)) return memory.get(article);
  const key = `smarttrip-photo:v2:${article}`;
  let saved = "";
  try {
    saved = localStorage.getItem(key) || "";
  } catch {
    // Private browsing can disable storage; the in-memory cache still works.
  }
  if (saved && isScenicPhoto(saved)) {
    memory.set(article, saved);
    return saved;
  }
  const request = api(
    `/destinations/photo?title=${encodeURIComponent(article)}`,
  )
    .then((result) => isScenicPhoto(result?.photoUrl || "") ? result?.photoUrl || "" : "")
    .then((url) => {
      if (url)
        try {
          localStorage.setItem(key, url);
        } catch {
          // Keep displaying the image even when persistent caching is blocked.
        }
      memory.set(article, url);
      return url;
    })
    .catch(() => {
      memory.set(article, "");
      return "";
    });
  memory.set(article, request);
  return request;
}

export default function DestinationPhoto({
  trip,
  className = "",
  eager = false,
}) {
  const article = destinationArticle(trip);
  const suppliedPhoto = trip?.destination?.imageUrl || "";
  const fixedPhoto = localPhotos[trip?.destination?.slug] || (isScenicPhoto(suppliedPhoto) ? suppliedPhoto : "");
  const [src, setSrc] = useState(fixedPhoto);
  const [triedResolvedPhoto, setTriedResolvedPhoto] = useState(!fixedPhoto);

  useEffect(() => {
    let active = true;
    if (fixedPhoto) {
      setSrc(fixedPhoto);
      setTriedResolvedPhoto(false);
      return () => {
        active = false;
      };
    }
    setTriedResolvedPhoto(true);
    setSrc("");
    resolvePhoto(article).then((url) => active && setSrc(url));
    return () => {
      active = false;
    };
  }, [article, fixedPhoto]);

  if (!src) return <span className="destination-photo-fallback" role="img" aria-label={`Photo unavailable for ${trip?.destination?.name || trip?.customLocation || "this destination"}`}><span aria-hidden="true">◇</span><small>{trip?.destination?.name || trip?.customLocation || "Explore the Philippines"}</small></span>;
  return (
    <img
      className={className}
      src={src}
      alt={localDescriptions[trip?.destination?.slug] || `${trip?.destination?.name || trip?.customLocation || "Philippine destination"} landmark`}
      style={trip?.destination?.slug === "cebu" ? { objectPosition: "center 42%" } : undefined}
      loading={eager ? "eager" : "lazy"}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!triedResolvedPhoto) {
          setTriedResolvedPhoto(true);
          resolvePhoto(article).then(setSrc);
        } else {
          setSrc("");
        }
      }}
    />
  );
}
