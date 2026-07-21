import React from 'react';
import upperMolarSvg from '../assets/teeth/upper_molar.svg';
import lowerMolarSvg from '../assets/teeth/lower_molar.svg';
import upperPremolarSvg from '../assets/teeth/upper_premolar.svg';
import lowerPremolarSvg from '../assets/teeth/lower_premolar.svg';
import canineSvg from '../assets/teeth/canine.svg';
import incisorSvg from '../assets/teeth/incisor.svg';
import corona3dImg from '../assets/teeth/corona.png';
import pernoImg from '../assets/teeth/perno.png';
import implanteImg from '../assets/teeth/implante.png';
import { getFigureUrlByKey } from '../utils/figureRegistry';

export interface FigureDef {
    type: string;
    color: string;
}

export interface SingleToothProps {
    tooth: number;
    activeFigures: FigureDef[];
    surfaceColors: Record<string, string>;
    onClickTooth?: (tooth: number) => void;
    onClickSurface?: (tooth: number, surface: string) => void;
    className?: string;
    readOnly?: boolean;
    mode?: 'anatomical' | 'surfaces' | 'both';
}

export const getToothType = (num: number) => {
    const lastDigit = num % 10;
    const isChild = num >= 51 && num <= 85;
    if (isChild) {
        if ([5, 4].includes(lastDigit)) return 'molar';
        if (lastDigit === 3) return 'canine';
        return 'incisor';
    } else {
        if ([8, 7, 6].includes(lastDigit)) return 'molar';
        if ([5, 4].includes(lastDigit)) return 'premolar';
        if (lastDigit === 3) return 'canine';
        return 'incisor';
    }
};

const SingleTooth: React.FC<SingleToothProps> = ({
    tooth,
    activeFigures,
    surfaceColors,
    onClickTooth,
    onClickSurface,
    className = "",
    readOnly = false,
    mode = 'both'
}) => {
    // Si no pasan className y estamos en modo "both", usar el tamaño por defecto original
    const containerClass = className || (mode === 'both' ? "relative w-10 h-20 sm:w-12 sm:h-24" : "");
    const isUpper = tooth < 30 || (tooth >= 51 && tooth <= 65);
    const toothType = getToothType(tooth);

    const isAbsent = activeFigures.some(f => f.type === 'tachar_ausente');
    const isExtraction = activeFigures.some(f => f.type === 'tachar_extraccion');
    const isImplant = activeFigures.some(f => f.type === 'implante');

    const handleToothClick = (e: React.MouseEvent) => {
        if (readOnly) return;
        // Don't trigger if clicked on a surface
        if ((e.target as SVGElement).tagName !== 'polygon' && (e.target as SVGElement).tagName !== 'circle' && onClickTooth) {
            onClickTooth(tooth);
        }
    };

    const handleSurfaceClick = (e: React.MouseEvent, surface: string) => {
        e.stopPropagation();
        if (!readOnly && onClickSurface) {
            onClickSurface(tooth, surface);
        }
    };

    const renderOverlayFigures = () => {
        const stackableTypes = ['circulo_corona', 'perno', 'implante'];
        const isStackable = (fig: FigureDef) => stackableTypes.includes(fig.type) || fig.type.startsWith('dynamic:');
        
        const stackableCount = activeFigures.filter(isStackable).length;
        let currentStackable = 0;

        return activeFigures.map((fig, idx) => {
            const color = fig.color;
            
            const renderContent = () => {
                // Extracción / Ausente (Cruz completa)
                if (fig.type === 'tachar_ausente' || fig.type === 'tachar_extraccion') {
                    return (
                        <g key={idx}>
                            <line x1="5" y1="5" x2="95" y2="195" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.8" />
                            <line x1="95" y1="5" x2="5" y2="195" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.8" />
                        </g>
                    );
                }
                
                // Corona
                if (fig.type === 'circulo_corona') {
                    return (
                        <g key={idx}>
                            <image 
                                href={corona3dImg} 
                                x="-10" 
                                y={isUpper ? 77 : 2} 
                                width="120" 
                                height="120" 
                                opacity="0.9"
                            />
                        </g>
                    );
                }

                // Corona Provisoria (nueva) - Línea punteada
                if (fig.type === 'corona_provisoria') {
                    return (
                        <circle key={idx} cx="50" cy={isUpper ? 137 : 62} r="38" fill="none" stroke={color} strokeWidth="6" strokeDasharray="8,4" opacity="0.85" />
                    );
                }
                
                // Sellante
                if (fig.type === 'sellante') {
                    return (
                        <g key={idx}>
                            <circle cx="50" cy={isUpper ? 137 : 62} r="18" fill={color} opacity="0.9" />
                            <text x="50" y={isUpper ? 144 : 69} textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">SFF</text>
                        </g>
                    );
                }
                
                // Fractura
                if (fig.type === 'fractura') {
                    return (
                        <path key={idx} d={isUpper ? "M20,110 L45,140 L55,120 L80,150" : "M20,40 L45,70 L55,50 L80,80"} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                    );
                }
                
                // Endodoncia (Conducto) - Ahora más prominente rellenando la zona radicular
                if (fig.type === 'conducto' || fig.type === 'endodoncia') {
                    return (
                        <g key={idx}>
                            <path d={isUpper ? "M50,90 L40,25 M50,90 L60,25" : "M50,110 L40,175 M50,110 L60,175"} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.95" />
                            <path d={isUpper ? "M50,95 L50,15" : "M50,105 L50,185"} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" opacity="0.95" />
                        </g>
                    );
                }
                
                // Perno
                if (fig.type === 'perno') {
                    return (
                        <g key={idx}>
                            <image 
                                href={pernoImg} 
                                x="0" 
                                y="0" 
                                width="100" 
                                height="200" 
                                transform={!isUpper ? 'rotate(180 50 100)' : undefined}
                                opacity="0.9"
                            />
                        </g>
                    );
                }

                // Puente
                if (fig.type === 'puente') {
                    return (
                        <rect key={idx} x="3" y={isUpper ? 97 : 22} width="94" height="76" fill="none" stroke={color} strokeWidth="6" rx="6" opacity="0.8" />
                    );
                }

                // Prótesis Removible (nuevo)
                if (fig.type === 'protesis_removible') {
                    const yBase = isUpper ? 170 : 30;
                    return (
                        <g key={idx}>
                            <path d={`M10,${yBase} Q50,${isUpper ? 190 : 10} 90,${yBase}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
                            <path d={`M10,${yBase} Q50,${isUpper ? 190 : 10} 90,${yBase}`} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4,4" />
                        </g>
                    );
                }
                
                // Ortodoncia
                if (fig.type === 'ortodoncia') {
                    const wireY = isUpper ? 132 : 68;
                    const bracketTop = isUpper ? 118 : 54;
                    return (
                        <g key={idx}>
                            <line x1="-5" y1={wireY} x2="105" y2={wireY} stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
                            <rect x="28" y={bracketTop} width="44" height="28" fill={color} rx="3" opacity="0.92" />
                            <rect x="28" y={wireY - 4} width="44" height="8" fill="white" fillOpacity="0.55" rx="1" />
                            <rect x="24" y={bracketTop} width="10" height="10" fill={color} rx="2" opacity="0.92" />
                            <rect x="66" y={bracketTop} width="10" height="10" fill={color} rx="2" opacity="0.92" />
                            <rect x="24" y={bracketTop + 18} width="10" height="10" fill={color} rx="2" opacity="0.92" />
                            <rect x="66" y={bracketTop + 18} width="10" height="10" fill={color} rx="2" opacity="0.92" />
                        </g>
                    );
                }
                
                // Implante
                if (fig.type === 'implante') {
                    return (
                        <g key={idx}>
                            <image 
                                href={implanteImg} 
                                x="0" 
                                y="0" 
                                width="100" 
                                height="200" 
                                transform={!isUpper ? 'rotate(180 50 100)' : undefined}
                                opacity="0.9"
                            />
                        </g>
                    );
                }

                // Dynamic Custom Figures
                if (fig.type.startsWith('dynamic:')) {
                    const pathKey = fig.type.replace('dynamic:', '');
                    const url = getFigureUrlByKey(pathKey);
                    if (url) {
                        return (
                            <g key={idx}>
                                <image 
                                    href={url} 
                                    x="0" 
                                    y="0" 
                                    width="100" 
                                    height="200" 
                                    transform={!isUpper ? 'rotate(180 50 100)' : undefined}
                                    opacity="0.9"
                                />
                            </g>
                        );
                    }
                }

                return null;
            };

            const content = renderContent();
            if (!content) return null;

            if (isStackable(fig) && stackableCount > 1) {
                const s = 1 / stackableCount;
                // Stack vertically
                const translateX = (100 - (100 * s)) / 2;
                const translateY = currentStackable * (200 * s);
                currentStackable++;
                return (
                    <g key={`wrap-${idx}`} transform={`translate(${translateX}, ${translateY}) scale(${s})`}>
                        {content}
                    </g>
                );
            }

            return <g key={`wrap-${idx}`}>{content}</g>;
        });
    };

    const getAsset = () => {
        if (toothType === 'molar') return isUpper ? upperMolarSvg : lowerMolarSvg;
        if (toothType === 'premolar') return isUpper ? upperPremolarSvg : lowerPremolarSvg;
        if (toothType === 'canine') return canineSvg;
        return incisorSvg;
    };

    return (
        <div 
            className={`${containerClass} relative transition-transform duration-300 ease-in-out hover:scale-[1.8] hover:z-50 select-none ${readOnly ? '' : 'cursor-pointer active:scale-[1.6]'}`}
            onClick={handleToothClick}
            title={`Pieza ${tooth}`}
        >
            {mode === 'surfaces' ? (
                // SURFACES ONLY MODE (100x100) - ORGANIC UNIFORM SHAPE
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    {!isAbsent && !isExtraction && (() => {
                        const dV = "M 20,20 Q 50,5 80,20 L 65,35 Q 50,25 35,35 Z";
                        const dD = "M 80,20 Q 95,50 80,80 L 65,65 Q 75,50 65,35 Z";
                        const dL = "M 80,80 Q 50,95 20,80 L 35,65 Q 50,75 65,65 Z";
                        const dM = "M 20,80 Q 5,50 20,20 L 35,35 Q 25,50 35,65 Z";
                        const dO = "M 35,35 Q 50,25 65,35 Q 75,50 65,65 Q 50,75 35,65 Q 25,50 35,35 Z";

                        return (
                            <g opacity={0.85}>
                                <path d={dO} fill={surfaceColors['O'] || 'transparent'} stroke="#52525b" strokeWidth="1.5" 
                                    className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'} 
                                    onClick={(e) => handleSurfaceClick(e, 'O')} />
                                <path d={dV} fill={surfaceColors['V'] || 'transparent'} stroke="#52525b" strokeWidth="1.5" 
                                    className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                    onClick={(e) => handleSurfaceClick(e, 'V')} />
                                <path d={dD} fill={surfaceColors['D'] || 'transparent'} stroke="#52525b" strokeWidth="1.5" 
                                    className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                    onClick={(e) => handleSurfaceClick(e, 'D')} />
                                <path d={dL} fill={surfaceColors['L'] || surfaceColors['P'] || 'transparent'} stroke="#52525b" strokeWidth="1.5" 
                                    className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                    onClick={(e) => handleSurfaceClick(e, 'L')} />
                                <path d={dM} fill={surfaceColors['M'] || 'transparent'} stroke="#52525b" strokeWidth="1.5" 
                                    className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                    onClick={(e) => handleSurfaceClick(e, 'M')} />
                            </g>
                        );
                    })()}
                    {/* Render basic cross if absent/extracted in surfaces mode too? */}
                    {(isAbsent || isExtraction) && (
                        <g>
                            <line x1="15" y1="15" x2="85" y2="85" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
                            <line x1="85" y1="15" x2="15" y2="85" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
                        </g>
                    )}
                </svg>
            ) : (
                // ANATOMICAL OR BOTH MODE (100x200)
                <svg viewBox="0 0 100 200" className="w-full h-full overflow-visible">
                    {/* Tooth Base Layer */}
                    <g transform={!isUpper ? 'rotate(180 50 100)' : undefined}>
                        <image href={getAsset()} x="0" y="0" width="100" height="200" preserveAspectRatio="xMidYMid meet" opacity={isAbsent || isExtraction ? 0.3 : (isImplant ? 0.5 : 1)} />
                    </g>

                    {/* Overlays (Implants, Crowns, Roots) */}
                    {renderOverlayFigures()}

                    {/* Surface Selection Circles (if mode is 'both') */}
                    {mode === 'both' && !isAbsent && !isExtraction && !isImplant && (
                        <g opacity={0.85} transform={isUpper ? 'translate(0, 85)' : 'translate(0, 15)'}>
                            <polygon points="35,35 65,35 65,65 35,65" fill={surfaceColors['O'] || 'transparent'} stroke="#52525b" strokeWidth="2" 
                                className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'} 
                                onClick={(e) => handleSurfaceClick(e, 'O')} />
                            {/* Top (Vestibular if Upper, Lingual if Lower) */}
                            <polygon points="15,15 85,15 65,35 35,35" fill={surfaceColors['V'] || 'transparent'} stroke="#52525b" strokeWidth="2" 
                                className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                onClick={(e) => handleSurfaceClick(e, 'V')} />
                            {/* Right (Mesial / Distal) */}
                            <polygon points="85,15 85,85 65,65 65,35" fill={surfaceColors['D'] || 'transparent'} stroke="#52525b" strokeWidth="2" 
                                className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                onClick={(e) => handleSurfaceClick(e, 'D')} />
                            {/* Bottom (Palatine / Lingual) */}
                            <polygon points="85,85 15,85 35,65 65,65" fill={surfaceColors['L'] || surfaceColors['P'] || 'transparent'} stroke="#52525b" strokeWidth="2" 
                                className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                onClick={(e) => handleSurfaceClick(e, 'L')} />
                            {/* Left (Distal / Mesial) */}
                            <polygon points="15,85 15,15 35,35 35,65" fill={surfaceColors['M'] || 'transparent'} stroke="#52525b" strokeWidth="2" 
                                className={readOnly ? '' : 'hover:fill-blue-200/50 cursor-pointer transition-colors'}
                                onClick={(e) => handleSurfaceClick(e, 'M')} />
                        </g>
                    )}
                </svg>
            )}
        </div>
    );
};

export default SingleTooth;
