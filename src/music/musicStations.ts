import type { Track } from "./musicQueue";

/**
 * Free public internet-radio streams (SomaFM is listener-supported, ad-free).
 * These are direct audio streams, so they play in a normal <audio> element.
 */
export const STATIONS: Track[] = [
  { id: "st-groovesalad", kind: "stream", title: "Groove Salad", subtitle: "Chilled downtempo beats", url: "https://ice1.somafm.com/groovesalad-128-mp3" },
  { id: "st-fluid", kind: "stream", title: "Fluid", subtitle: "Instrumental hip-hop, lo-fi", url: "https://ice1.somafm.com/fluid-128-mp3" },
  { id: "st-lush", kind: "stream", title: "Lush", subtitle: "Mellow vocals and chill", url: "https://ice1.somafm.com/lush-128-mp3" },
  { id: "st-dronezone", kind: "stream", title: "Drone Zone", subtitle: "Ambient textures for deep focus", url: "https://ice1.somafm.com/dronezone-128-mp3" },
  { id: "st-deepspaceone", kind: "stream", title: "Deep Space One", subtitle: "Deep ambient, space music", url: "https://ice1.somafm.com/deepspaceone-128-mp3" },
  { id: "st-sonicuniverse", kind: "stream", title: "Sonic Universe", subtitle: "Jazz-flavoured, transcending", url: "https://ice1.somafm.com/sonicuniverse-128-mp3" },
];
