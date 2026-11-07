import begin from "@/assets/sound/begin.mp3";
import defeat from "@/assets/sound/defeat.mp3";
import place from "@/assets/sound/place.mp3";
import victory from "@/assets/sound/victory.mp3";
import { readPreference } from "@/lib/preferences";

const SOUNDS = { begin, defeat, place, victory };

export type Sound = keyof typeof SOUNDS;

/** Play one of the game's sounds, unless the player turned them off. */
export function playSound(sound: Sound) {
    if (readPreference("muted")) {
        return;
    }

    const audio = new Audio(SOUNDS[sound]);
    audio.volume = 0.4;
    // A browser refuses to play before the player has interacted with the page, which is fine.
    audio.play().catch(() => {});
}
