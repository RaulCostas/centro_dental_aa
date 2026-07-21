const fs = require('fs');
let content = fs.readFileSync('centro-dental-aa-frontend-main/src/components/PacienteTabFicha.tsx', 'utf-8');

const startMatch = 'if (loading)     const handlePrintPaciente';
const startIdx = content.indexOf(startMatch);

if (startIdx > -1) {
    const endStr = `Swal.fire('Error', 'No se pudo generar el documento de impresiA3n', 'error');\n        }\n    };`;
    const endIdx = content.indexOf(endStr, startIdx);
    
    if (endIdx > -1) {
        const fullFunc = content.substring(startIdx + 17, endIdx + endStr.length);
        
        let newContent = content.substring(0, startIdx);
        newContent += `if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );`;
        newContent += '\n\n    const handlePrintPaciente' + fullFunc.substring('const handlePrintPaciente'.length) + '\n\n';
        
        let remainder = content.substring(endIdx + endStr.length);
        remainder = remainder.replace(/^\s*return \(/m, '    return (');
        newContent += remainder;
        
        fs.writeFileSync('centro-dental-aa-frontend-main/src/components/PacienteTabFicha.tsx', newContent);
        console.log('Fixed!');
    } else {
        console.log('End not found');
    }
} else {
    console.log('Start not found');
}
