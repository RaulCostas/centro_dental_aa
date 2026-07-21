import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import type { Arancel } from '../types';

import upperMolarSvg from '../assets/teeth/upper_molar.svg';
import lowerMolarSvg from '../assets/teeth/lower_molar.svg';
import upperPremolarSvg from '../assets/teeth/upper_premolar.svg';
import lowerPremolarSvg from '../assets/teeth/lower_premolar.svg';
import canineSvg from '../assets/teeth/canine.svg';
import incisorSvg from '../assets/teeth/incisor.svg';
import SingleTooth from './SingleTooth';
import { getFigureForConditionCode, getColorForSurfaceCode } from '../utils/odontogramMappings';


interface OdontogramProps {
    initialData?: any;
    onChange?: (data: any) => void;
    readOnly?: boolean;
    onSelectSurface?: (tooth: number, surface: string) => void;
    onSelectTooth?: (tooth: number) => void;
    dentitionType?: 'adult' | 'child' | 'mixed';
    treatmentPlanItems?: any[];
    aranceles?: Arancel[];
}

const adultToothNumbers = {
    upper: [
        [18, 17, 16, 15, 14, 13, 12, 11],
        [21, 22, 23, 24, 25, 26, 27, 28]
    ],
    lower: [
        [48, 47, 46, 45, 44, 43, 42, 41],
        [31, 32, 33, 34, 35, 36, 37, 38]
    ]
};

const childToothNumbers = {
    upper: [
        [55, 54, 53, 52, 51],
        [61, 62, 63, 64, 65]
    ],
    lower: [
        [85, 84, 83, 82, 81],
        [71, 72, 73, 74, 75]
    ]
};



const Odontogram: React.FC<OdontogramProps> = ({ 
    initialData, 
    onChange, 
    readOnly = false,
    onSelectSurface,
    onSelectTooth,
    dentitionType = 'adult',
    treatmentPlanItems = [],
    aranceles = []
}) => {
    const activeToothNumbers = dentitionType === 'child' ? childToothNumbers : adultToothNumbers;

    const getToothType = (num: number) => {
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

    const handleSurfaceClick = (tooth: number, surface: string) => {
        if (readOnly) return;
        if (onSelectSurface) {
            onSelectSurface(tooth, surface);
        }
    };

    const handleToothClick = (tooth: number) => {
        if (readOnly) return;
        if (onSelectTooth) {
            onSelectTooth(tooth);
        }
    };

    // Find proposed treatments from the plan
    const getProposedTreatment = (tooth: number, surface?: string) => {
        return treatmentPlanItems.find(item => {
            const matchesTooth = Number(item.tooth) === tooth;
            if (!matchesTooth) return false;
            if (surface) {
                return item.surface === surface;
            }
            return !item.surface;
        });
    };

    const getArancelConfig = (arancelId: number) => {
        return aranceles.find(a => a.id === arancelId);
    };

    const getSurfaceColor = (tooth: number, surface: string) => {
        // Check proposed treatments first
        const proposed = getProposedTreatment(tooth, surface);
        if (proposed) {
            const config = getArancelConfig(proposed.arancelId);
            if (config?.odontogramaColor) {
                return config.odontogramaColor;
            }
        }
        
        // Fallback to initialData if no proposed treatment
        if (initialData && initialData[tooth] && initialData[tooth].surfaces && initialData[tooth].surfaces[surface]) {
            const code = initialData[tooth].surfaces[surface];
            return getColorForSurfaceCode(code);
        }
        
        return 'transparent';
    };

    const getActiveFigures = (tooth: number) => {
        const figures: { type: string; color: string }[] = [];

        // Historical states from initialData
        if (initialData && initialData[tooth]) {
            const stateCode = initialData[tooth].state;
            if (stateCode) {
                const fig = getFigureForConditionCode(stateCode);
                if (fig) figures.push(fig);
            }
            const connCode = initialData[tooth].connectionType;
            if (connCode) {
                const fig = getFigureForConditionCode(connCode);
                if (fig) figures.push(fig);
            }
        }

        // Proposed treatments figures
        treatmentPlanItems.forEach(item => {
            if (Number(item.tooth) === tooth) {
                const config = getArancelConfig(item.arancelId);
                if (config?.odontogramaFigura && config.odontogramaFigura !== 'none') {
                    figures.push({
                        type: config.odontogramaFigura,
                        color: config.odontogramaColor || '#3b82f6'
                    });
                }
            }
        });

        return figures;
    };

    const renderToothColumnUpper = (num: number) => {
        const activeFigures = getActiveFigures(num);
        const surfaceColors = {
            O: getSurfaceColor(num, 'O') !== 'transparent' ? getSurfaceColor(num, 'O') : '',
            V: getSurfaceColor(num, 'V') !== 'transparent' ? getSurfaceColor(num, 'V') : '',
            L: getSurfaceColor(num, 'L') !== 'transparent' ? getSurfaceColor(num, 'L') : '',
            M: getSurfaceColor(num, 'M') !== 'transparent' ? getSurfaceColor(num, 'M') : '',
            D: getSurfaceColor(num, 'D') !== 'transparent' ? getSurfaceColor(num, 'D') : '',
        };

        return (
            <div key={num} className="flex flex-col items-center gap-1 group/tooth p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all w-8 sm:w-10 relative hover:z-[60]">
                <span className="text-[9px] sm:text-[10px] font-black text-gray-500 group-hover/tooth:text-blue-500 transition-colors mb-1">{num}</span>
                <SingleTooth 
                    tooth={num} activeFigures={activeFigures} surfaceColors={surfaceColors}
                    onClickTooth={onSelectTooth || ((t) => {})} 
                    onClickSurface={onSelectSurface ? (t, s) => onSelectSurface(t, s) : (t, s) => handleSurfaceClick(t, s)}
                    readOnly={readOnly} mode="anatomical" className="w-8 h-16 sm:w-10 sm:h-20"
                />
                <SingleTooth 
                    tooth={num} activeFigures={activeFigures} surfaceColors={surfaceColors}
                    onClickTooth={onSelectTooth || ((t) => {})} 
                    onClickSurface={onSelectSurface ? (t, s) => onSelectSurface(t, s) : (t, s) => handleSurfaceClick(t, s)}
                    readOnly={readOnly} mode="surfaces" className="w-8 h-8 sm:w-10 sm:h-10 -mt-1"
                />
            </div>
        );
    };

    const renderToothColumnLower = (num: number) => {
        const activeFigures = getActiveFigures(num);
        const surfaceColors = {
            O: getSurfaceColor(num, 'O') !== 'transparent' ? getSurfaceColor(num, 'O') : '',
            V: getSurfaceColor(num, 'V') !== 'transparent' ? getSurfaceColor(num, 'V') : '',
            L: getSurfaceColor(num, 'L') !== 'transparent' ? getSurfaceColor(num, 'L') : '',
            M: getSurfaceColor(num, 'M') !== 'transparent' ? getSurfaceColor(num, 'M') : '',
            D: getSurfaceColor(num, 'D') !== 'transparent' ? getSurfaceColor(num, 'D') : '',
            C: getSurfaceColor(num, 'C') !== 'transparent' ? getSurfaceColor(num, 'C') : '',
        };

        return (
            <div key={num} className="flex flex-col items-center gap-1 group/tooth p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all w-8 sm:w-10 relative hover:z-[60]">
                <SingleTooth 
                    tooth={num} activeFigures={activeFigures} surfaceColors={surfaceColors}
                    onClickTooth={onSelectTooth || ((t) => {})} 
                    onClickSurface={onSelectSurface ? (t, s) => onSelectSurface(t, s) : (t, s) => handleSurfaceClick(t, s)}
                    readOnly={readOnly} mode="surfaces" className="w-8 h-8 sm:w-10 sm:h-10 -mb-1"
                />
                <SingleTooth 
                    tooth={num} activeFigures={activeFigures} surfaceColors={surfaceColors}
                    onClickTooth={onSelectTooth || ((t) => {})} 
                    onClickSurface={onSelectSurface ? (t, s) => onSelectSurface(t, s) : (t, s) => handleSurfaceClick(t, s)}
                    readOnly={readOnly} mode="anatomical" className="w-8 h-16 sm:w-10 sm:h-20"
                />
                <span className="text-[9px] sm:text-[10px] font-black text-gray-500 group-hover/tooth:text-blue-500 transition-colors mt-1">{num}</span>
            </div>
        );
    };

    const renderToothColumnAdultLower = renderToothColumnLower;

    return (
        <div id="odontogram-print-container" className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <Shield className="text-blue-600" size={24} />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Odontograma Clínico</h3>
                </div>
            </div>

            {/* Tooth Grid */}
            <div className="flex justify-center w-full mt-4 select-none overflow-x-auto">
                <div className="min-w-max flex flex-col items-center">
                    
                    {/* Header Numbers */}
                    <div className="flex w-full px-4 mb-2">
                        <div className="flex-1 flex justify-end gap-1 sm:gap-2 pr-4 border-r-2 border-transparent">
                            <span className="text-[10px] font-black text-gray-400 mr-4">SUPERIOR DERECHA</span>
                        </div>
                        <div className="flex-1 flex justify-start gap-1 sm:gap-2 pl-4">
                            <span className="text-[10px] font-black text-gray-400 ml-4">SUPERIOR IZQUIERDA</span>
                        </div>
                    </div>

                    <div className="flex flex-col relative bg-white dark:bg-gray-800/50 p-2 sm:p-6 rounded-lg border border-gray-100 dark:border-gray-800">
                        {/* THE BIG CROSS */}
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-black dark:bg-white transform -translate-y-1/2 z-0 opacity-80"></div>
                        <div className="absolute top-4 bottom-4 left-1/2 w-0.5 bg-black dark:bg-white transform -translate-x-1/2 z-0 opacity-80"></div>

                        {/* UPPER ARCH */}
                        <div className="flex z-10 mb-4 sm:mb-8">
                            {/* Upper Right (Quadrant 1) */}
                            <div className="flex justify-end gap-0.5 sm:gap-1 pr-4 sm:pr-8">
                                <div className="flex gap-0.5 sm:gap-1">
                                    {adultToothNumbers.upper[0].map(renderToothColumnUpper)}
                                </div>
                            </div>
                            {/* Upper Left (Quadrant 2) */}
                            <div className="flex justify-start gap-0.5 sm:gap-1 pl-4 sm:pl-8">
                                <div className="flex gap-0.5 sm:gap-1">
                                    {adultToothNumbers.upper[1].map(renderToothColumnUpper)}
                                </div>
                            </div>
                        </div>

                        {/* CHILD UPPER ARCH */}
                        <div className="flex z-10 mb-4 sm:mb-8 opacity-90 scale-90 origin-bottom">
                            <div className="flex justify-end gap-0.5 sm:gap-1 pr-4 sm:pr-8 w-1/2">
                                <div className="flex gap-0.5 sm:gap-1 justify-end w-full">
                                    {childToothNumbers.upper[0].map(renderToothColumnUpper)}
                                </div>
                            </div>
                            <div className="flex justify-start gap-0.5 sm:gap-1 pl-4 sm:pl-8 w-1/2">
                                <div className="flex gap-0.5 sm:gap-1 justify-start w-full">
                                    {childToothNumbers.upper[1].map(renderToothColumnUpper)}
                                </div>
                            </div>
                        </div>

                        {/* CHILD LOWER ARCH */}
                        <div className="flex z-10 mt-4 sm:mt-8 opacity-90 scale-90 origin-top">
                            <div className="flex justify-end gap-0.5 sm:gap-1 pr-4 sm:pr-8 w-1/2">
                                <div className="flex gap-0.5 sm:gap-1 justify-end w-full">
                                    {childToothNumbers.lower[0].map(renderToothColumnLower)}
                                </div>
                            </div>
                            <div className="flex justify-start gap-0.5 sm:gap-1 pl-4 sm:pl-8 w-1/2">
                                <div className="flex gap-0.5 sm:gap-1 justify-start w-full">
                                    {childToothNumbers.lower[1].map(renderToothColumnLower)}
                                </div>
                            </div>
                        </div>

                        {/* LOWER ARCH */}
                        <div className="flex z-10 mt-4 sm:mt-8">
                            {/* Lower Right (Quadrant 4) */}
                            <div className="flex justify-end gap-0.5 sm:gap-1 pr-4 sm:pr-8">
                                <div className="flex gap-0.5 sm:gap-1">
                                    {adultToothNumbers.lower[0].map(renderToothColumnAdultLower)}
                                </div>
                            </div>
                            {/* Lower Left (Quadrant 3) */}
                            <div className="flex justify-start gap-0.5 sm:gap-1 pl-4 sm:pl-8">
                                <div className="flex gap-0.5 sm:gap-1">
                                    {adultToothNumbers.lower[1].map(renderToothColumnAdultLower)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex w-full px-4 mt-2">
                        <div className="flex-1 flex justify-end gap-1 sm:gap-2 pr-4">
                            <span className="text-[10px] font-black text-gray-400 mr-4">INFERIOR DERECHA</span>
                        </div>
                        <div className="flex-1 flex justify-start gap-1 sm:gap-2 pl-4">
                            <span className="text-[10px] font-black text-gray-400 ml-4">INFERIOR IZQUIERDA</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Odontogram;
