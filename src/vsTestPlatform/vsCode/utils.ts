import * as path from "path";

/**
 * Retrieve a icon resource from the resource folder
 * @param name Resource Image Name
 * @return an icon
 */
export function getImageResource(name: string): { light: string; dark: string } {
    return {
        light: path.join(__filename, "..", "..", "..", "..", "resources", "light", name),
        dark: path.join(__filename, "..", "..", "..", "..", "resources", "dark", name)
    };
}