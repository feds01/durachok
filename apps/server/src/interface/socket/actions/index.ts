import onJoin from "./join";
import onKick from "./kick";
import onLeave from "./leave";
import onMessage from "./message";
import onMove from "./move";
import onSettingsUpdate from "./settings";
import onStart from "./start";

/** Export all of the actions. */
export const actions = [onJoin, onLeave, onKick, onMessage, onMove, onStart, onSettingsUpdate];
