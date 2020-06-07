export interface INameSegment {
    start: number;
    end: number;
}

export interface IParsedName {
    fullName: string;
    segments: INameSegment[];
}

export function parseTestName(name: string): IParsedName {
    let i = 0;
    const segments = [];
    while (i < name.length) {
        segments.push(parseSegment());
    }
    return { fullName: name, segments };

    function parseSegment(): INameSegment {
        const start = i;
        while (i < name.length) {
            if (tryParseBrackets()) { continue; }
            if (name[i] === "." || name[i] === "+") { break; }
            i++;
        }
        const end = i;
        i++;
        return { start, end };
    }

    function tryParseBrackets(): boolean {
        if (name[i] !== "(") { return false; }
        i++;
        while (i < name.length) {
            if (name[i] === ")") {
                i++;
                break;
            }
            const parsedSomething =
                tryParseBrackets()
                || tryParseLiteral('"', '"')
                || tryParseLiteral("'", "'");
            if (!parsedSomething) { i++; }
        }
        return true;
    }

    function tryParseLiteral(startChar: string, endChar: string): boolean {
        if (name[i] !== startChar) { return false; }
        i++;
        while (i < name.length) {
            if (name[i] === "\\") {
                i += 2;
                continue;
            } else if (name[i] === endChar) {
                i++;
                break;
            } else {
                i++;
            }
        }
        return true;
    }
}
