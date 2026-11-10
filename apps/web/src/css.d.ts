import "react";

/**
 * CSS custom properties, such as `--card-scale`, which a style sets for the stylesheet to read.
 * React's types don't list them, so they're declared here once, rather than cast at each style.
 */
declare module "react" {
    interface CSSProperties {
        [property: `--${string}`]: string | number | undefined;
    }
}
