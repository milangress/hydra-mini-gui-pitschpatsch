export interface ElementProperties {
    style?: Partial<CSSStyleDeclaration>;
    classes?: string[];
    attributes?: Record<string, string>;
}

export interface Layout {
    zIndex: number;
    position: {
        top?: string;
        left?: string;
        right?: string;
        bottom?: string;
    };
}

export interface CustomStyles {
    [key: string]: string;
} 