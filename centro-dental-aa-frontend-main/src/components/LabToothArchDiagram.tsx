import React from 'react';

interface LabToothArchDiagramProps {
    selectedTeeth: string[];
    onToothToggle: (toothId: string) => void;
}

interface ToothData {
    id: string;
    x: number;
    y: number;
    textX: number;
    textY: number;
    type: 'incisor' | 'canine' | 'upper_premolar' | 'lower_premolar' | 'upper_molar' | 'lower_molar';
}

const TEETH_DATA: ToothData[] = [
    // SUPERIOR ARCH (18..11, 21..28)
    { id: '18', x: 54, y: 215, textX: 24, textY: 220, type: 'upper_molar' },
    { id: '17', x: 56, y: 180, textX: 26, textY: 185, type: 'upper_molar' },
    { id: '16', x: 60, y: 145, textX: 30, textY: 150, type: 'upper_molar' },
    { id: '15', x: 68, y: 112, textX: 38, textY: 117, type: 'upper_premolar' },
    { id: '14', x: 80, y: 82,  textX: 52, textY: 85,  type: 'upper_premolar' },
    { id: '13', x: 100, y: 58, textX: 74, textY: 56,  type: 'canine' },
    { id: '12', x: 126, y: 40, textX: 108, textY: 30, type: 'incisor' },
    { id: '11', x: 152, y: 30, textX: 145, textY: 16, type: 'incisor' },

    { id: '21', x: 188, y: 30, textX: 195, textY: 16, type: 'incisor' },
    { id: '22', x: 214, y: 40, textX: 232, textY: 30, type: 'incisor' },
    { id: '23', x: 240, y: 58, textX: 266, textY: 56, type: 'canine' },
    { id: '24', x: 260, y: 82, textX: 288, textY: 85, type: 'upper_premolar' },
    { id: '25', x: 272, y: 112, textX: 302, textY: 117, type: 'upper_premolar' },
    { id: '26', x: 280, y: 145, textX: 310, textY: 150, type: 'upper_molar' },
    { id: '27', x: 284, y: 180, textX: 314, textY: 185, type: 'upper_molar' },
    { id: '28', x: 286, y: 215, textX: 316, textY: 220, type: 'upper_molar' },

    // INFERIOR ARCH (48..41, 31..38)
    { id: '48', x: 54, y: 255, textX: 24, textY: 260, type: 'lower_molar' },
    { id: '47', x: 56, y: 290, textX: 26, textY: 295, type: 'lower_molar' },
    { id: '46', x: 60, y: 325, textX: 30, textY: 330, type: 'lower_molar' },
    { id: '45', x: 68, y: 358, textX: 38, textY: 363, type: 'lower_premolar' },
    { id: '44', x: 80, y: 388, textX: 52, textY: 395, type: 'lower_premolar' },
    { id: '43', x: 100, y: 412, textX: 74, textY: 424, type: 'canine' },
    { id: '42', x: 126, y: 430, textX: 108, textY: 448, type: 'incisor' },
    { id: '41', x: 152, y: 440, textX: 145, textY: 462, type: 'incisor' },

    { id: '31', x: 188, y: 440, textX: 195, textY: 462, type: 'incisor' },
    { id: '32', x: 214, y: 430, textX: 232, textY: 448, type: 'incisor' },
    { id: '33', x: 240, y: 412, textX: 266, textY: 424, type: 'canine' },
    { id: '34', x: 260, y: 388, textX: 288, textY: 395, type: 'lower_premolar' },
    { id: '35', x: 272, y: 358, textX: 302, textY: 363, type: 'lower_premolar' },
    { id: '36', x: 280, y: 325, textX: 310, textY: 330, type: 'lower_molar' },
    { id: '37', x: 284, y: 290, textX: 314, textY: 295, type: 'lower_molar' },
    { id: '38', x: 286, y: 255, textX: 316, textY: 260, type: 'lower_molar' },
];

export const LabToothArchDiagram: React.FC<LabToothArchDiagramProps> = ({ selectedTeeth, onToothToggle }) => {

    const renderToothShape = (type: ToothData['type'], isSelected: boolean) => {
        const fillColor = isSelected ? '#fee2e2' : '#ffffff';
        const strokeColor = isSelected ? '#dc2626' : '#1f2937';

        switch (type) {
            case 'upper_molar':
                return (
                    <g>
                        {/* Upper Molar Rhomboidal Occlusal Outline */}
                        <path d="M-14,-10 C-15,-14 -10,-16 -4,-16 C2,-16 8,-16 13,-12 C16,-8 16,-2 15,4 C14,9 10,14 4,15 C-3,16 -10,15 -14,10 C-16,5 -15,-2 -14,-10 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
                        {/* Cusp Grooves */}
                        <path d="M-10,-4 C-4,-2 0,-3 6,-6 M0,-14 V0 M2,0 C6,4 10,8 12,11" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                        <circle cx="-5" cy="-6" r="1" fill={strokeColor} opacity="0.4" />
                        <circle cx="5" cy="5" r="1" fill={strokeColor} opacity="0.4" />
                    </g>
                );
            case 'lower_molar':
                return (
                    <g>
                        {/* Lower Molar Oblong 5-Cusp Occlusal Outline */}
                        <path d="M-16,-10 C-16,-15 -8,-16 0,-16 C8,-16 16,-15 16,-10 C16,-4 16,4 16,10 C16,15 8,16 0,16 C-8,16 -16,15 -16,10 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
                        {/* Cross + Y Developmental Grooves */}
                        <path d="M-12,0 H12 M0,-12 V12 M-5,-12 L-2,0 L-5,12 M5,-12 L2,0 L5,12" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                        <circle cx="0" cy="0" r="1.2" fill={strokeColor} opacity="0.5" />
                    </g>
                );
            case 'upper_premolar':
                return (
                    <g>
                        {/* Biconvex Oval Outline */}
                        <path d="M-12,-8 C-14,-13 0,-15 12,-8 C15,-3 15,3 12,8 C0,15 -14,13 -12,8 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
                        {/* Central Groove */}
                        <line x1="-8" y1="0" x2="8" y2="0" stroke={strokeColor} strokeWidth="1.2" opacity="0.7" />
                        <path d="M-6,0 L-9,-4 M-6,0 L-9,4 M6,0 L9,-4 M6,0 L9,4" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
                    </g>
                );
            case 'lower_premolar':
                return (
                    <g>
                        {/* Circular Occlusal Outline */}
                        <circle cx="0" cy="0" r="11.5" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" />
                        {/* Crescent Cusp Groove */}
                        <path d="M-7,-3 C-2,0 2,0 7,-3 M0,0 V7" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
                    </g>
                );
            case 'canine':
                return (
                    <g>
                        {/* Diamond/Pentagonal Incisal Edge Outline */}
                        <path d="M0,-13 C6,-13 11,-6 10,2 C9,8 5,12 0,13 C-5,12 -9,8 -10,2 C-11,-6 -6,-13 0,-13 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
                        {/* Labial Ridge Line */}
                        <line x1="0" y1="-9" x2="0" y2="8" stroke={strokeColor} strokeWidth="1.2" opacity="0.7" />
                        <path d="M-5,2 C0,4 0,4 5,2" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
                    </g>
                );
            case 'incisor':
            default:
                return (
                    <g>
                        {/* Incisor Arch Labial Outline */}
                        <path d="M-11,-7 C-11,-12 11,-12 11,-7 C11,2 7,9 0,10 C-7,9 -11,2 -11,-7 Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
                        {/* Cingulum Ridge */}
                        <path d="M-8,-4 C0,-1 0,-1 8,-4" stroke={strokeColor} strokeWidth="1" opacity="0.6" />
                        <path d="M-4,3 C0,5 0,5 4,3" stroke={strokeColor} strokeWidth="1" opacity="0.5" />
                    </g>
                );
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center select-none">
            <h4 className="text-xs font-black uppercase text-blue-900 dark:text-blue-300 tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                MARQUE LOS DIENTES CON X (Haga clic sobre cada pieza)
            </h4>

            {/* SVG ARCH CONTAINER */}
            <div className="relative w-full max-w-[360px] flex justify-center">
                <svg viewBox="0 0 340 480" className="w-full h-auto drop-shadow-sm">

                    {/* SUPERIOR ARCH BACKDROP LABEL */}
                    <text x="170" y="130" textAnchor="middle" className="fill-blue-900 dark:fill-blue-300 text-[14px] font-black tracking-widest uppercase">
                        SUPERIOR
                    </text>

                    {/* INFERIOR ARCH BACKDROP LABEL */}
                    <text x="170" y="340" textAnchor="middle" className="fill-blue-900 dark:fill-blue-300 text-[14px] font-black tracking-widest uppercase">
                        INFERIOR
                    </text>

                    {/* TEETH RENDER */}
                    {TEETH_DATA.map((tooth) => {
                        const isSelected = selectedTeeth.includes(tooth.id);

                        return (
                            <g key={tooth.id} className="cursor-pointer group" onClick={() => onToothToggle(tooth.id)}>
                                {/* TOOTH NUMBER LABEL (Outside the arch) */}
                                <text
                                    x={tooth.textX}
                                    y={tooth.textY}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className={`text-[12px] font-black transition-colors ${
                                        isSelected 
                                            ? 'fill-red-600 dark:fill-red-400 text-sm' 
                                            : 'fill-gray-800 dark:fill-gray-200 group-hover:fill-blue-600'
                                    }`}
                                >
                                    {tooth.id}
                                </text>

                                {/* TOOTH ANATOMICAL SHAPE */}
                                <g transform={`translate(${tooth.x}, ${tooth.y})`}>
                                    {renderToothShape(tooth.type, isSelected)}

                                    {/* BOLD RED X OVERLAY WHEN SELECTED */}
                                    {isSelected && (
                                        <g stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round">
                                            <line x1="-12" y1="-12" x2="12" y2="12" />
                                            <line x1="12" y1="-12" x2="-12" y2="12" />
                                        </g>
                                    )}
                                </g>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* SUMMARY & RESET */}
            <div className="mt-3 flex items-center justify-between w-full pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                <span className="text-gray-600 dark:text-gray-300 font-medium">
                    Dientes Marcados: <strong className="text-red-600 dark:text-red-400">{selectedTeeth.length > 0 ? selectedTeeth.join(', ') : 'Ninguno'}</strong>
                </span>
                {selectedTeeth.length > 0 && (
                    <button
                        type="button"
                        onClick={() => selectedTeeth.forEach(t => onToothToggle(t))}
                        className="text-red-500 hover:text-red-700 underline text-[11px] font-semibold"
                    >
                        Limpiar Selección
                    </button>
                )}
            </div>
        </div>
    );
};

export default LabToothArchDiagram;
