// src/utils/figureRegistry.ts

// Use Vite's glob import to automatically discover all images in the odontograma_figuras directory.
// We use eager: true to synchronously load the module URLs during the build.
const figuresGlob = import.meta.glob('../assets/odontograma_figuras/**/*.{png,jpg,jpeg,svg,gif}', { eager: true });

export interface DynamicFigure {
    pathKey: string;     // e.g. "ortodoncia/bracket.png"
    specialty: string;   // e.g. "ortodoncia"
    filename: string;    // e.g. "bracket.png"
    name: string;        // e.g. "Bracket" (formatted)
    url: string;         // The actual imported URL to be used in <image href={url} />
}

export const getDynamicFigures = (): DynamicFigure[] => {
    const figures: DynamicFigure[] = [];

    for (const path in figuresGlob) {
        // path looks like: "../assets/odontograma_figuras/ortodoncia/bracket.png"
        const relativePath = path.replace('../assets/odontograma_figuras/', '');
        
        const parts = relativePath.split('/');
        let specialty = 'General';
        let filename = relativePath;
        
        if (parts.length > 1) {
            specialty = parts[0];
            filename = parts[parts.length - 1];
        }

        // Format name from filename (e.g. "bracket_metal.png" -> "Bracket Metal")
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
        const formattedName = nameWithoutExt
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        // Safely extract the default export (the URL string) from the glob module
        const module: any = figuresGlob[path];
        const url = module.default || module;

        figures.push({
            pathKey: relativePath,
            specialty: specialty.charAt(0).toUpperCase() + specialty.slice(1).toLowerCase(),
            filename,
            name: formattedName,
            url
        });
    }

    // Sort by specialty then name
    return figures.sort((a, b) => {
        if (a.specialty !== b.specialty) return a.specialty.localeCompare(b.specialty);
        return a.name.localeCompare(b.name);
    });
};

export const getFigureUrlByKey = (pathKey: string): string | null => {
    const figures = getDynamicFigures();
    const figure = figures.find(f => f.pathKey === pathKey);
    return figure ? figure.url : null;
};
