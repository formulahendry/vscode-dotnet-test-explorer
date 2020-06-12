export interface IStringView {
    start: number;
    end: number;
}

export interface ISegment {
    prefix?: IStringView,
    name: IStringView,
    brackets?: IStringView,
}

export interface IParsedName {
    fullName: string;
    segments: ISegment[];
}

export function parseTestName(name: string): IParsedName {
    let i = 0;
    const segments: ISegment[] = [];
    while (i < name.length) {
        segments.push(parseSegment());
    }
    return { fullName: name, segments };

    function parseSegment(): ISegment {
        const prefix = parsePrefix();
        const _name = parseName();
        const brackets = parseBrackets();
        return { prefix, name: _name, brackets };
    }

    function parsePrefix(): IStringView | undefined {
        if (name[i] === "." || name[i] === "+") {
            const result = { start: i, end: i + 1 };
            i++;
            return result;
        }
    }
    function parseName(): IStringView {
        const start = i;
        while (i < name.length) {
            if (name[i] === "(" || name[i] === "+" || name[i] === ".") {
                break;
            }
            i++;
        }
        return { start, end: i };
    }
    function parseBrackets(): IStringView | undefined {
        const start = i;
        if (tryParseBrackets()) { return { start, end: i }; }
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

export function getSegmentString(fullName: string, segment: ISegment) {
    return fullName.substring(segment.name.start, getSegmentEnd(segment));
}

export function getSegmentStart(segment: ISegment) {
    return segment.prefix?.start ?? segment.name.start;
}

export function getSegmentEnd(segment: ISegment) {
    return segment.brackets?.end ?? segment.name.end;
}
export function viewToString(fullName: string, view: IStringView) {
    return fullName.substring(view.start, view.end);
}
